import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import * as dotenv from 'dotenv';
import { TokenBlacklistService } from './token-blacklist.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { ReferralsService } from '../referrals/referrals.service';
import { referralGroup } from '../referrals/referral-policy';

dotenv.config();

const jwtSecret = process.env.JWT_SECRET?.trim();
if (!jwtSecret) {
  throw new Error('JWT_SECRET must be configured in .env');
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly blacklist: TokenBlacklistService, @InjectRepository(User) private readonly users: Repository<User>, private readonly referrals: ReferralsService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: any) {
    // Extract the raw token from the Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : null;

    // Reject if the token has been blacklisted (logged out)
    if (token && this.blacklist.isBlacklisted(token)) {
      throw new UnauthorizedException('Session has been terminated. Please log in again.');
    }

    if (typeof payload.sub !== 'string' || !payload.sub) throw new UnauthorizedException('Invalid account session.');
    const user = await this.users.findOne({ where: { id: payload.sub }, select: ['id', 'email', 'plan', 'role', 'status', 'gender'] });
    if (!user || user.status !== 'active') throw new UnauthorizedException('This account is no longer active.');
    if (user.role === 'user' && referralGroup(user.gender)) await this.referrals.recordActivity(user.id);
    return { userId: user.id, email: user.email, plan: user.plan, role: user.role };
  }
}
