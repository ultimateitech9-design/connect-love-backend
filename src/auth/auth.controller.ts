import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { TokenBlacklistService } from './token-blacklist.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly blacklist: TokenBlacklistService,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  async adminLogin(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.adminLogin(dto);
    
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
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.superAdminLogin(dto);
    
    response.cookie('admin_token', result.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    });

    return { message: 'Super Admin login successful', user: result.user };
  }

  @Post('marketing/login')
  @HttpCode(HttpStatus.OK)
  async marketingLogin(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.marketingLogin(dto);
    
    response.cookie('admin_token', result.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    });

    return { message: 'Marketing login successful', user: result.user };
  }

  @Post('finance/login')
  @HttpCode(HttpStatus.OK)
  async financeLogin(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.financeLogin(dto);
    
    response.cookie('admin_token', result.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    });

    return { message: 'Finance login successful', user: result.user };
  }

  @Post('management/login')
  @HttpCode(HttpStatus.OK)
  async managementLogin(
    @Body() dto: LoginDto & { role: string },
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.managementLogin(dto);

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
  logout(
    @Headers('authorization') authHeader: string | undefined,
    @Body() body: { token?: string },
  ) {
    // Extract token from header first, then fall back to body (sendBeacon payload)
    let token: string | undefined;

    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    } else if (body?.token) {
      token = body.token;
    }

    if (token) {
      this.blacklist.blacklist(token);
    }

    return { message: 'Logged out successfully' };
  }
}
