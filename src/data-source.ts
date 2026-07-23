import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { User } from './users/user.entity';
import { MatchRelation } from './matches/match.entity';
import { Message } from './messages/message.entity';
import { Contact } from './support/contact.entity';
import { SubscriptionPlan } from './platform/subscription-plan.entity';
import { Payment } from './platform/payment.entity';
import { VerificationRequest } from './platform/verification-request.entity';
import { PlatformNotification } from './platform/platform-notification.entity';
import { AuditLog } from './platform/audit-log.entity';
import { PlatformSetting } from './platform/platform-setting.entity';
import { PlatformRole } from './platform/role.entity';
import { VideoCall } from './messages/video-call.entity';
import { EmailRegistrationOtp } from './auth/email-registration-otp.entity';
import { DivorcedLead } from './divorced/divorced-lead.entity';
import { ProfileView } from './users/profile-view.entity';

dotenv.config();

export default new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD ?? 'root',
  database: process.env.DB_NAME || 'dating_web_app',
  entities: [
    User,
    MatchRelation,
    Message,
    Contact,
    SubscriptionPlan,
    Payment,
    VerificationRequest,
    PlatformNotification,
    AuditLog,
    PlatformSetting,
    PlatformRole,
    VideoCall,
    EmailRegistrationOtp,
    DivorcedLead,
    ProfileView,
  ],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: false,
});
