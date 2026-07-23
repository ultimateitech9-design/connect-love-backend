import { MigrationInterface, QueryRunner } from 'typeorm';

export class CampaignApprovalWorkflow1784990000000 implements MigrationInterface {
  name = 'CampaignApprovalWorkflow1784990000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE platform_notifications
        MODIFY status enum(
          'draft','pending_approval','active','scheduled','sent','paused','rejected','expired'
        ) NOT NULL DEFAULT 'draft',
        ADD description varchar(500) NOT NULL DEFAULT '',
        ADD discountPercent smallint unsigned NULL,
        ADD ctaLabel varchar(80) NOT NULL DEFAULT 'View offer',
        ADD ctaUrl varchar(255) NOT NULL DEFAULT '/user/premium',
        ADD placement varchar(40) NOT NULL DEFAULT 'user_dashboard',
        ADD createdByUserId varchar(36) NULL,
        ADD createdByRole varchar(30) NULL,
        ADD approvedByUserId varchar(36) NULL,
        ADD submittedAt datetime(6) NULL,
        ADD approvedAt datetime(6) NULL,
        ADD rejectedAt datetime(6) NULL,
        ADD rejectionReason varchar(500) NULL,
        ADD startsAt datetime(6) NULL,
        ADD endsAt datetime(6) NULL,
        ADD impressions int unsigned NOT NULL DEFAULT 0,
        ADD clicks int unsigned NOT NULL DEFAULT 0,
        ADD dismissals int unsigned NOT NULL DEFAULT 0,
        ADD updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        ADD INDEX IDX_platform_notifications_status_dates (status, startsAt, endsAt),
        ADD INDEX IDX_platform_notifications_creator (createdByUserId, createdAt)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE platform_notifications
      SET status = 'draft'
      WHERE status IN ('pending_approval', 'rejected', 'expired')
    `);
    await queryRunner.query(`
      ALTER TABLE platform_notifications
        DROP INDEX IDX_platform_notifications_creator,
        DROP INDEX IDX_platform_notifications_status_dates,
        DROP updatedAt,
        DROP dismissals,
        DROP clicks,
        DROP impressions,
        DROP endsAt,
        DROP startsAt,
        DROP rejectionReason,
        DROP rejectedAt,
        DROP approvedAt,
        DROP submittedAt,
        DROP approvedByUserId,
        DROP createdByRole,
        DROP createdByUserId,
        DROP placement,
        DROP ctaUrl,
        DROP ctaLabel,
        DROP discountPercent,
        DROP description,
        MODIFY status enum('draft','scheduled','active','sent','paused') NOT NULL DEFAULT 'draft'
    `);
  }
}
