import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';
import * as dotenv from 'dotenv';
import * as express from 'express';

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
