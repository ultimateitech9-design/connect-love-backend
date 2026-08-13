import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import * as dotenv from 'dotenv';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { TokenBlacklistService } from './token-blacklist.service';
import { User } from '../users/user.entity';
import { AuditLog } from '../platform/audit-log.entity';
import { EmailRegistrationOtp } from './email-registration-otp.entity';
import { RegistrationOtpService } from './registration-otp.service';

dotenv.config();

const jwtSecret = process.env.JWT_SECRET?.trim();
if (!jwtSecret) {
  throw new Error('JWT_SECRET must be configured in .env');
}

@Module({
  imports: [
    TypeOrmModule.forFeature([User, AuditLog, EmailRegistrationOtp]),
    PassportModule,
    JwtModule.register({
      secret: jwtSecret,
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, TokenBlacklistService, RegistrationOtpService],
  exports: [JwtModule, TokenBlacklistService],
})
export class AuthModule {}
