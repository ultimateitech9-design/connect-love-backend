import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import { Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';
import { User } from '../users/user.entity';
import { EmailRegistrationOtp } from './email-registration-otp.entity';

const OTP_EXPIRY_MINUTES = 10;
const OTP_RESEND_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;
const OTP_MAX_SENDS_PER_HOUR = 5;

@Injectable()
export class RegistrationOtpService {
  private transporter: nodemailer.Transporter | null = null;

  constructor(
    @InjectRepository(EmailRegistrationOtp)
    private readonly otpRepo: Repository<EmailRegistrationOtp>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private otpSecret() {
    const secret = process.env.OTP_HASH_SECRET?.trim() || process.env.JWT_SECRET?.trim();
    if (!secret) {
      throw new ServiceUnavailableException('OTP service is not configured.');
    }
    return secret;
  }

  private hashOtp(email: string, otp: string) {
    return createHmac('sha256', this.otpSecret()).update(`${email}:${otp}`).digest('hex');
  }

  private mailer() {
    if (this.transporter) return this.transporter;

    const host = process.env.SMTP_HOST?.trim();
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASSWORD;
    if (!host || !user || !pass) {
      throw new ServiceUnavailableException('Email delivery is not configured.');
    }

    const port = Number(process.env.SMTP_PORT || 465);
    const secure = (process.env.SMTP_SECURE || String(port === 465)).toLowerCase() === 'true';
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 20_000,
    });
    return this.transporter;
  }

  async request(emailInput: string) {
    const email = this.normalizeEmail(emailInput);
    const existingUser = await this.userRepo.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException('An account with this email already exists.');
    }

    const now = new Date();
    const current = await this.otpRepo.findOne({ where: { email } });
    if (current) {
      const elapsedMs = now.getTime() - current.lastSentAt.getTime();
      if (elapsedMs < OTP_RESEND_SECONDS * 1000) {
        const waitSeconds = Math.ceil((OTP_RESEND_SECONDS * 1000 - elapsedMs) / 1000);
        throw new HttpException(
          `Please wait ${waitSeconds} seconds before requesting another OTP.`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    const oneHourMs = 60 * 60 * 1000;
    const sameWindow = current && now.getTime() - current.sendWindowStartedAt.getTime() < oneHourMs;
    if (sameWindow && current.sendCount >= OTP_MAX_SENDS_PER_HOUR) {
      throw new HttpException(
        'Too many OTP requests. Please try again in one hour.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const otp = randomInt(100000, 1000000).toString();
    const challenge = this.otpRepo.create({
      email,
      otpHash: this.hashOtp(email, otp),
      expiresAt: new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000),
      attempts: 0,
      lastSentAt: now,
      sendWindowStartedAt: sameWindow ? current.sendWindowStartedAt : now,
      sendCount: sameWindow ? current.sendCount + 1 : 1,
    });
    await this.otpRepo.save(challenge);

    const fromAddress = process.env.SMTP_FROM?.trim() || process.env.SMTP_USER?.trim();
    try {
      await this.mailer().sendMail({
        from: fromAddress,
        to: email,
        subject: `${otp} is your Connect Love verification code`,
        text: `Your Connect Love verification code is ${otp}. It expires in ${OTP_EXPIRY_MINUTES} minutes. Never share this code with anyone.`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px;color:#172033">
            <h1 style="font-size:24px;margin:0 0 12px;color:#e11d48">Connect Love</h1>
            <p style="font-size:16px;line-height:1.6">Use this verification code to finish creating your account:</p>
            <div style="font-size:34px;font-weight:800;letter-spacing:8px;text-align:center;padding:20px;margin:22px 0;background:#fff1f2;border-radius:14px;color:#be123c">${otp}</div>
            <p style="font-size:14px;line-height:1.6;color:#596273">This code expires in ${OTP_EXPIRY_MINUTES} minutes. Never share it with anyone. If you did not request this code, you can ignore this email.</p>
          </div>
        `,
      });
    } catch {
      await this.otpRepo.delete({ email });
      throw new ServiceUnavailableException('We could not send the OTP email. Please try again.');
    }

    return { message: 'OTP sent successfully.', expiresInSeconds: OTP_EXPIRY_MINUTES * 60 };
  }

  async requestPasswordReset(emailInput: string) {
    const email = this.normalizeEmail(emailInput);
    const existingUser = await this.userRepo.findOne({ where: { email } });
    if (!existingUser) {
      throw new UnauthorizedException('No account was found with this email address.');
    }

    const now = new Date();
    const current = await this.otpRepo.findOne({ where: { email } });
    if (current) {
      const elapsedMs = now.getTime() - current.lastSentAt.getTime();
      if (elapsedMs < OTP_RESEND_SECONDS * 1000) {
        const waitSeconds = Math.ceil((OTP_RESEND_SECONDS * 1000 - elapsedMs) / 1000);
        throw new HttpException(
          `Please wait ${waitSeconds} seconds before requesting another OTP.`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    const oneHourMs = 60 * 60 * 1000;
    const sameWindow = current && now.getTime() - current.sendWindowStartedAt.getTime() < oneHourMs;
    if (sameWindow && current.sendCount >= OTP_MAX_SENDS_PER_HOUR) {
      throw new HttpException(
        'Too many OTP requests. Please try again in one hour.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const otp = randomInt(100000, 1000000).toString();
    await this.otpRepo.save(this.otpRepo.create({
      email,
      otpHash: this.hashOtp(email, otp),
      expiresAt: new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000),
      attempts: 0,
      lastSentAt: now,
      sendWindowStartedAt: sameWindow ? current.sendWindowStartedAt : now,
      sendCount: sameWindow ? current.sendCount + 1 : 1,
    }));

    const fromAddress = process.env.SMTP_FROM?.trim() || process.env.SMTP_USER?.trim();
    try {
      await this.mailer().sendMail({
        from: fromAddress,
        to: email,
        subject: `${otp} is your ConnectLove password reset code`,
        text: `Your ConnectLove password reset code is ${otp}. It expires in ${OTP_EXPIRY_MINUTES} minutes. Never share this code with anyone.`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px;color:#172033">
            <h1 style="font-size:24px;margin:0 0 12px;color:#e11d48">ConnectLove</h1>
            <p style="font-size:16px;line-height:1.6">Use this code to reset your account password:</p>
            <div style="font-size:34px;font-weight:800;letter-spacing:8px;text-align:center;padding:20px;margin:22px 0;background:#fff1f2;border-radius:14px;color:#be123c">${otp}</div>
            <p style="font-size:14px;line-height:1.6;color:#596273">This code expires in ${OTP_EXPIRY_MINUTES} minutes. If you did not request a password reset, you can ignore this email.</p>
          </div>
        `,
      });
    } catch {
      await this.otpRepo.delete({ email });
      throw new ServiceUnavailableException('We could not send the OTP email. Please try again.');
    }

    return { message: 'Password reset OTP sent successfully.', expiresInSeconds: OTP_EXPIRY_MINUTES * 60 };
  }

  async verify(emailInput: string, otp: string) {
    const email = this.normalizeEmail(emailInput);
    const challenge = await this.otpRepo.findOne({ where: { email } });
    if (!challenge) {
      throw new UnauthorizedException('Request a new OTP before continuing.');
    }

    if (challenge.expiresAt.getTime() <= Date.now()) {
      await this.otpRepo.delete({ email });
      throw new UnauthorizedException('This OTP has expired. Please request a new one.');
    }

    if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
      await this.otpRepo.delete({ email });
      throw new UnauthorizedException('Too many incorrect attempts. Please request a new OTP.');
    }

    const supplied = Buffer.from(this.hashOtp(email, otp), 'hex');
    const stored = Buffer.from(challenge.otpHash, 'hex');
    if (supplied.length !== stored.length || !timingSafeEqual(supplied, stored)) {
      challenge.attempts += 1;
      if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
        await this.otpRepo.delete({ email });
        throw new UnauthorizedException('Too many incorrect attempts. Please request a new OTP.');
      }
      await this.otpRepo.save(challenge);
      throw new UnauthorizedException('The OTP is incorrect. Please try again.');
    }

    await this.otpRepo.delete({ email });
    return email;
  }
}
