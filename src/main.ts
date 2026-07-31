import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';
import * as dotenv from 'dotenv';
import * as express from 'express';
import type { NextFunction, Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { PlatformSetting } from './platform/platform-setting.entity';

dotenv.config();

function parseAllowedOrigins(): string[] {
  const configured = process.env.FRONTEND_ORIGINS
    || process.env.FRONTEND_URL
    || 'http://localhost:3002,https://connectlove.in,https://www.connectlove.in';
  return configured
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  if (parseAllowedOrigins().includes(origin)) return true;

  // In local development the frontend is commonly opened from another device
  // through Next.js' Network URL (for example http://192.168.1.7:3002).
  if (process.env.NODE_ENV !== 'production') {
    return /^http:\/\/(localhost|127\.0\.0\.1|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}):3002$/.test(origin);
  }

  return false;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  app.setGlobalPrefix(process.env.API_PREFIX || '', { exclude: ['/health'] });

  // Increase JSON body limit to 10 MB (needed for base64 profile photos)
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  const dataSource = app.get(DataSource);
  const jwtService = app.get(JwtService, { strict: false });
  let maintenanceCache = { enabled: false, checkedAt: 0 };

  app.use(async (request: Request, response: Response, next: NextFunction) => {
    const path = request.path.replace(/\/$/, '') || '/';
    const alwaysAllowed = path === '/api/health'
      || path === '/api/maintenance-status'
      || path === '/auth/super-admin/login'
      || path === '/auth/management/login';
    if (alwaysAllowed) return next();

    try {
      if (Date.now() - maintenanceCache.checkedAt > 2_000) {
        const setting = await dataSource.getRepository(PlatformSetting).findOne({
          where: { key: 'platform_flags' },
        });
        const flags = (setting?.value || {}) as Record<string, boolean>;
        maintenanceCache = {
          enabled: flags.maintenanceMode ?? false,
          checkedAt: Date.now(),
        };
      }

      if (!maintenanceCache.enabled) return next();

      const authorization = request.headers.authorization;
      const token = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
      if (token) {
        const payload = await jwtService.verifyAsync<{ role?: string }>(token);
        if (payload.role === 'super_admin') return next();
      }
    } catch {
      // Invalid or expired credentials do not bypass maintenance mode.
    }

    return response.status(503).json({
      statusCode: 503,
      maintenanceMode: true,
      message: 'ConnectLove is temporarily unavailable for scheduled maintenance.',
    });
  });

  // Security: Secure HTTP headers
  app.use(helmet());

  // Enable CORS for independently deployed frontend origins.
  app.enableCors({
    origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
    credentials: true,
  });

  // Global validation with class-validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 SoulMatch API running on http://localhost:${port}`);
}

bootstrap();
