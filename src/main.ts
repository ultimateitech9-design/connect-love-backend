import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';
import * as dotenv from 'dotenv';
import * as express from 'express';

dotenv.config();

function parseAllowedOrigins(): string[] {
  const configured = process.env.FRONTEND_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:3002';
  return configured
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
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
    origin: parseAllowedOrigins(),
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
  await app.listen(port);
  console.log(`🚀 SoulMatch API running on http://localhost:${port}`);
}

bootstrap();
