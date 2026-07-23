import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  Headers,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { TokenBlacklistService } from './token-blacklist.service';
import { LoginDto } from './dto/login.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { RequestRegistrationOtpDto } from './dto/request-registration-otp.dto';
import { VerifyRegistrationDto } from './dto/verify-registration.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly blacklist: TokenBlacklistService,
  ) {}

  private loginContext(request: Request) {
    const forwarded = request.headers['x-forwarded-for'];
    const forwardedIp = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0];
    const ipAddress = (forwardedIp && forwardedIp !== 'Unknown' ? forwardedIp : undefined)
      || request.ip
      || request.socket.remoteAddress
      || 'Unknown';
    return {
      ipAddress: ipAddress.trim(),
      device: String(request.headers['x-client-user-agent'] || request.headers['user-agent'] || 'Unknown device'),
    };
  }

  private tokenFrom(authHeader: string | undefined, body?: { token?: string }) {
    if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7).trim();
    return body?.token;
  }

  @Post('register/request-otp')
  @HttpCode(HttpStatus.OK)
  requestRegistrationOtp(@Body() dto: RequestRegistrationOtpDto) {
    return this.authService.requestRegistrationOtp(dto.email);
  }

  @Post('register')
  register(@Body() dto: VerifyRegistrationDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto, @Req() request: Request) {
    return this.authService.login(dto, this.loginContext(request));
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  googleLogin(@Body() dto: GoogleAuthDto, @Req() request: Request) {
    return this.authService.googleLogin(dto.credential, this.loginContext(request));
  }

  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  async adminLogin(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.adminLogin(dto, this.loginContext(request));
    
    // Set the token as an HTTP-only cookie
    response.cookie('admin_token', result.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    });

    return { message: 'Admin login successful', user: result.user };
  }

  @Post('super-admin/login')
  @HttpCode(HttpStatus.OK)
  async superAdminLogin(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.superAdminLogin(dto, this.loginContext(request));
    
    response.cookie('admin_token', result.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    });

    return { message: 'Super Admin login successful', user: result.user };
  }

  @Post('management/login')
  @HttpCode(HttpStatus.OK)
  async managementLogin(
    @Body() dto: LoginDto & { role: string },
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.managementLogin(dto, this.loginContext(request));

    response.cookie('management_token', result.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24,
    });

    return { message: 'Management login successful', user: result.user, access_token: result.access_token };
  }

  /**
   * POST /auth/logout
   *
   * Accepts the JWT via:
   *   1. Authorization: Bearer <token>  header  (from the logout() utility)
   *   2. Body: { token }                         (from navigator.sendBeacon on browser close)
   *
   * The token is added to the in-memory blacklist, which is checked by JwtStrategy
   * on every subsequent request.
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Headers('authorization') authHeader: string | undefined,
    @Body() body: { token?: string },
  ) {
    const token = this.tokenFrom(authHeader, body);

    if (token) {
      await this.authService.endSession(token);
      this.blacklist.blacklist(token);
    }

    return { message: 'Logged out successfully' };
  }

  @Post('activity')
  @HttpCode(HttpStatus.OK)
  activity(@Headers('authorization') authHeader: string | undefined) {
    return this.authService.touchSession(this.tokenFrom(authHeader));
  }
}
