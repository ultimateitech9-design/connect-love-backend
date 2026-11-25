import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { AuditLog } from '../platform/audit-log.entity';
import { RolesGuard } from '../auth/roles.guard';
import { AdminEmailCampaign, AdminEmailRecipient } from './admin-email.entity';
import { AdminEmailController } from './admin-email.controller';
import { AdminEmailService } from './admin-email.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, AuditLog, AdminEmailCampaign, AdminEmailRecipient])],
  controllers: [AdminEmailController],
  providers: [AdminEmailService, RolesGuard],
})
export class AdminEmailModule {}
