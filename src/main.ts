import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { isAllowedOrigin } from './common/cors';
import * as dotenv from 'dotenv';
import { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { PlatformSetting } from './platform/platform-setting.entity';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
  app.enableShutdownHooks();
  app.setGlobalPrefix(process.env.API_PREFIX || '', { exclude: ['/health'] });

  // Increase JSON body limit to 10 MB (needed for base64 profile photos)
  app.useBodyParser('json', { limit: '10mb' });
  app.useBodyParser('urlencoded', { limit: '10mb', extended: true });

  const dataSource = app.get(DataSource);
  const jwtService = app.get(JwtService, { strict: false });
  let maintenanceCache = { enabled: false, checkedAt: 0 };

  app.use(async (request: Request, response: Response, next: NextFunction) => {
    const path = request.path.replace(/\/$/, '') || '/';
    const alwaysAllowed = path === '/api/health'
      || path === '/api/maintenance-status'
      || path === '/auth/super-admin/login'
      || path === '/auth/management/login';
    const paymentWebhook = path === '/payments/razorpay/webhook' || path === '/wallet/razorpay/webhook';
    if (alwaysAllowed || paymentWebhook) return next();

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
