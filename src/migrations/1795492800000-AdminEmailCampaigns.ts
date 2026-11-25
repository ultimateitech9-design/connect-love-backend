import { MigrationInterface, QueryRunner } from 'typeorm';

export class AdminEmailCampaigns1795492800000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE admin_email_campaigns (
      id varchar(36) NOT NULL PRIMARY KEY,
      createdBy varchar(36) NOT NULL, requestId varchar(36) NOT NULL,
      subject varchar(200) NOT NULL, message text NOT NULL,
      audience varchar(10) NOT NULL, total int unsigned NOT NULL,
      imageBase64 mediumtext NULL,
      createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      UNIQUE KEY UQ_admin_email_request (createdBy, requestId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await q.query(`CREATE TABLE admin_email_recipients (
      id varchar(36) NOT NULL PRIMARY KEY,
      campaignId varchar(36) NOT NULL, userId varchar(36) NOT NULL,
      email varchar(255) NOT NULL, name varchar(150) NOT NULL,
      status varchar(10) NOT NULL DEFAULT 'pending', error varchar(255) NULL,
      attemptedAt datetime NULL,
      createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      UNIQUE KEY UQ_admin_email_recipient (campaignId, email),
      KEY IDX_admin_email_queue (status, createdAt),
      CONSTRAINT FK_admin_email_campaign FOREIGN KEY (campaignId) REFERENCES admin_email_campaigns(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query('DROP TABLE admin_email_recipients');
    await q.query('DROP TABLE admin_email_campaigns');
  }
}
