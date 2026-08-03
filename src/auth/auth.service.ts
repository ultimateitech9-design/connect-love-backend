import {
  Injectable, BadRequestException, ConflictException, UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as CryptoJS from 'crypto-js';
import { User } from '../users/user.entity';
import { LoginDto } from './dto/login.dto';
import { AuditLog } from '../platform/audit-log.entity';
import { OAuth2Client } from 'google-auth-library';
import { randomUUID } from 'crypto';
import { RegistrationOtpService } from './registration-otp.service';
import { VerifyRegistrationDto } from './dto/verify-registration.dto';

export interface LoginContext {
  ipAddress?: string;
  device?: string;
}

@Injectable()
export class AuthService {
  private readonly googleClient = new OAuth2Client();
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
    private readonly jwtService: JwtService,
    private readonly registrationOtpService: RegistrationOtpService,
  ) {}

  private decryptOrUsePlainPassword(password: string): string {
    try {
      const secret = process.env.CRYPTO_SECRET || 'fallback-secret-key';
      const bytes = CryptoJS.AES.decrypt(password, secret);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      return decrypted || password;
    } catch {
      return password;
    }
  }

  private signUserToken(user: User, sessionId?: string) {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      plan: user.plan,
      role: user.role || 'user',
      sid: sessionId,
    });
  }

  private async startSession(user: User, context: LoginContext = {}) {
    const now = new Date();
    const log = await this.auditRepo.save(this.auditRepo.create({
      userId: user.id,
      user: user.name || user.email,
      activity: 'Logged in',
      ipAddress: context.ipAddress || 'Unknown',
      action: 'Active',
      module: 'Authentication',
      role: user.role || 'user',
      device: (context.device || 'Unknown device').slice(0, 255),
      loginAt: now,
      lastActivityAt: now,
    }));
    log.sessionId = log.id;
    return this.auditRepo.save(log);
  }

  async touchSession(token?: string) {
    const payload = this.readToken(token);
    if (!payload?.sid) return { updated: false };
    const log = await this.auditRepo.findOne({ where: { sessionId: payload.sid } });
    if (!log || log.logoutAt) return { updated: false };
    log.lastActivityAt = new Date();
    log.durationSeconds = Math.max(0, Math.floor((log.lastActivityAt.getTime() - log.loginAt.getTime()) / 1000));
    await this.auditRepo.save(log);
    return { updated: true };
  }

  async endSession(token?: string) {
    const payload = this.readToken(token);
    if (!payload?.sid) return;
    const log = await this.auditRepo.findOne({ where: { sessionId: payload.sid } });
    if (!log || log.logoutAt) return;
    const now = new Date();
    log.logoutAt = now;
    log.lastActivityAt = now;
    log.durationSeconds = Math.max(0, Math.floor((now.getTime() - log.loginAt.getTime()) / 1000));
    log.activity = 'Logged out';
    log.action = 'Completed';
    await this.auditRepo.save(log);
  }

  private readToken(token?: string): { sid?: string } | null {
    if (!token) return null;
    try {
      return this.jwtService.verify(token) as { sid?: string };
    } catch {
      return null;
    }
  }

  requestRegistrationOtp(email: string) {
    return this.registrationOtpService.request(email);
  }

  requestPasswordResetOtp(email: string) {
    return this.registrationOtpService.requestPasswordReset(email);
  }

  async resetPassword(emailInput: string, otp: string, newPassword: string) {
    const email = emailInput.trim().toLowerCase();
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.password')
      .where('u.email = :email', { email })
      .getOne();
    if (!user) throw new UnauthorizedException('No account was found with this email address.');

    await this.registrationOtpService.verify(email, otp);
    user.password = await bcrypt.hash(newPassword, 12);
    await this.userRepo.save(user);
    return { message: 'Password updated successfully.' };
  }

  async register(dto: VerifyRegistrationDto) {
    const email = dto.email.trim().toLowerCase();
    const hasGpsCoordinates = dto.locationLatitude != null || dto.locationLongitude != null;
    if (hasGpsCoordinates && (dto.locationLatitude == null || dto.locationLongitude == null || dto.locationAccuracy == null || dto.locationAccuracy > 1500)) {
      throw new BadRequestException('A precise GPS location is required. Please enable Precise Location and try again.');
    }
    const birthDate = new Date(`${dto.birthDate}T00:00:00Z`);
    const minimumBirthDate = new Date();
    minimumBirthDate.setUTCHours(0, 0, 0, 0);
    minimumBirthDate.setUTCFullYear(minimumBirthDate.getUTCFullYear() - 18);
    if (Number.isNaN(birthDate.getTime()) || birthDate > minimumBirthDate) {
      throw new BadRequestException('You must be at least 18 years old to create an account.');
    }

    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists.');
    }

    await this.registrationOtpService.verify(email, dto.otp);

    const hashed = await bcrypt.hash(dto.password, 12);
    const user = this.userRepo.create({
      name: dto.name,
      email,
      password: hashed,
      birthDate,
      gender: dto.gender,
      city: dto.city,
      locationLatitude: dto.locationLatitude,
      locationLongitude: dto.locationLongitude,
      emailVerifiedAt: new Date(),
    });
    const saved = await this.userRepo.save(user);
    const { password: _, ...safe } = saved as any;
    return { message: 'Account created successfully', user: safe };
  }

  async login(dto: LoginDto, context: LoginContext = {}) {
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.password')
      .where('u.email = :email', { email: dto.email })
      .getOne();

    if (!user) throw new UnauthorizedException('Invalid email or password.');
    if (user.role !== 'user') {
      throw new UnauthorizedException('Please use the management login for this account.');
    }
    if (user.status !== 'active') {
      throw new UnauthorizedException('This account is not active. Please contact support.');
    }

    const match = await bcrypt.compare(dto.password, user.password);
    if (!match) throw new UnauthorizedException('Invalid email or password.');

    const session = await this.startSession(user, context);
    const token = this.signUserToken(user, session.sessionId);

    return {
      access_token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        plan: user.plan,
        role: user.role,
        onboardingCompleted: user.onboardingCompleted,
      },
    };
  }

  async googleLogin(credential: string, context: LoginContext = {}) {
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    if (!clientId) {
      throw new UnauthorizedException('Google sign-in is not configured on the server.');
    }

    let payload;
    try {
      const ticket = await this.googleClient.verifyIdToken({ idToken: credential, audience: clientId });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Google sign-in could not be verified. Please try again.');
    }

    const email = payload?.email?.trim().toLowerCase();
    if (!email || !payload?.email_verified) {
      throw new UnauthorizedException('A verified Google email is required.');
    }

    let user = await this.userRepo.findOne({ where: { email } });
    let isNewUser = false;

    if (user) {
      if (user.role !== 'user') {
        throw new UnauthorizedException('Please use the management login for this account.');
      }
      if (user.status !== 'active') {
        throw new UnauthorizedException('This account is not active. Please contact support.');
      }
      if (!user.emailVerifiedAt) {
        user.emailVerifiedAt = new Date();
        user = await this.userRepo.save(user);
      }
    } else {
      const password = await bcrypt.hash(randomUUID(), 12);
      user = await this.userRepo.save(this.userRepo.create({
        name: payload.name?.trim() || email.split('@')[0],
        email,
        password,
        avatarUrl: payload.picture || undefined,
        role: 'user',
        status: 'active',
        onboardingCompleted: false,
        emailVerifiedAt: new Date(),
      }));
      isNewUser = true;
    }

    const session = await this.startSession(user, context);
    const token = this.signUserToken(user, session.sessionId);

    return {
      access_token: token,
      isNewUser,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        plan: user.plan,
        role: user.role,
        onboardingCompleted: user.onboardingCompleted,
      },
    };
  }

  async adminLogin(dto: LoginDto, context: LoginContext = {}) {
    const decryptedPassword = this.decryptOrUsePlainPassword(dto.password);

    // 2. Find user
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.password')
      .where('u.email = :email', { email: dto.email })
      .getOne();

    if (!user) throw new UnauthorizedException('Invalid email or password.');

    // 3. Ensure role is admin or super_admin
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      throw new UnauthorizedException('Access denied. Admin privileges required.');
    }

    // 4. Verify password
    const match = await bcrypt.compare(decryptedPassword, user.password);
    if (!match) throw new UnauthorizedException('Invalid email or password.');

    const session = await this.startSession(user, context);
    const token = this.signUserToken(user, session.sessionId);

    return {
      access_token: token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }

  async superAdminLogin(dto: LoginDto, context: LoginContext = {}) {
    const decryptedPassword = this.decryptOrUsePlainPassword(dto.password);

    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.password')
      .where('u.email = :email', { email: dto.email })
      .getOne();

    if (!user) throw new UnauthorizedException('Invalid email or password.');

    if (user.role !== 'super_admin') {
      throw new UnauthorizedException('Access denied. Super Admin privileges required.');
    }

    const match = await bcrypt.compare(decryptedPassword, user.password);
    if (!match) throw new UnauthorizedException('Invalid email or password.');

    const session = await this.startSession(user, context);
    const token = this.signUserToken(user, session.sessionId);

    return {
      access_token: token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }

  async managementLogin(dto: LoginDto & { role: string }, context: LoginContext = {}) {
    const roleMap: Record<string, string[]> = {
      admin: ['admin', 'super_admin'],
      'super-admin': ['super_admin'],
      sales: ['sales', 'super_admin'],
      support: ['support', 'admin', 'super_admin'],
    };

    const allowedRoles = roleMap[dto.role];
    if (!allowedRoles) {
      throw new UnauthorizedException('Unknown management role.');
    }

    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.password')
      .where('u.email = :email', { email: dto.email })
      .getOne();

    if (!user) throw new UnauthorizedException('Invalid email or password.');
    if (!allowedRoles.includes(user.role)) {
      throw new UnauthorizedException('Access denied for this management portal.');
    }

    const password = this.decryptOrUsePlainPassword(dto.password);
    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new UnauthorizedException('Invalid email or password.');

    const session = await this.startSession(user, context);
    const token = this.signUserToken(user, session.sessionId);
    return {
      access_token: token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }
}
