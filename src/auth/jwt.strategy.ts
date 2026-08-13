import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import * as dotenv from 'dotenv';
import { TokenBlacklistService } from './token-blacklist.service';

dotenv.config();

const jwtSecret = process.env.JWT_SECRET?.trim();
if (!jwtSecret) {
  throw new Error('JWT_SECRET must be configured in .env');
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly blacklist: TokenBlacklistService) {
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

    return { userId: payload.sub, email: payload.email, plan: payload.plan, role: payload.role || 'user' };
  }
}
