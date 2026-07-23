import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformApiController } from './platform-api.controller';
import { User } from '../users/user.entity';
import { Contact } from '../support/contact.entity';
import { MatchRelation } from '../matches/match.entity';
import { Payment } from '../platform/payment.entity';
import { SubscriptionPlan } from '../platform/subscription-plan.entity';
import { VerificationRequest } from '../platform/verification-request.entity';
import { PlatformNotification } from '../platform/platform-notification.entity';
import { AuditLog } from '../platform/audit-log.entity';
import { PlatformSetting } from '../platform/platform-setting.entity';
import { PlatformRole } from '../platform/role.entity';
import { RolesGuard } from '../auth/roles.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Contact,
      MatchRelation,
      Payment,
      SubscriptionPlan,
      VerificationRequest,
      PlatformNotification,
      AuditLog,
      PlatformSetting,
      PlatformRole,
    ]),
  ],
  controllers: [PlatformApiController],
  providers: [RolesGuard],
})
export class ApiModule {}
