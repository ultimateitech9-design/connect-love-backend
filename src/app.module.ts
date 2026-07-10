import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import * as dotenv from 'dotenv';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AdminModule } from './admin/admin.module';
import { SupportModule } from './support/support.module';
import { HealthController } from './health.controller';
import { MessagesModule } from './messages/messages.module';
import { MatchesModule } from './matches/matches.module';
import { DiscoveryModule } from './discovery/discovery.module';
import { ProfilePhotosModule } from './profile-photos/profile-photos.module';
import { ApiModule } from './api/api.module';
import { KycModule } from './kyc/kyc.module';

dotenv.config();

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      username: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD ?? 'root',
      database: process.env.DB_NAME || 'dating_web_app',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      migrations: [__dirname + '/migrations/*{.ts,.js}'],
      migrationsRun: process.env.TYPEORM_MIGRATIONS_RUN === 'true',
      synchronize: false,
      logging: false,
    }),
    AuthModule,
    UsersModule,
    AdminModule,
    SupportModule,
    MessagesModule,
    MatchesModule,
    DiscoveryModule,
    ProfilePhotosModule,
    ApiModule,
    KycModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
