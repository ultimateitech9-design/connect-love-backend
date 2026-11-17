import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserEmailManagement1786176000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE user_emails (
      id varchar(36) NOT NULL, email varchar(255) NOT NULL, userId varchar(36) NOT NULL,
      isPrimary tinyint NOT NULL DEFAULT 0, verifiedAt datetime NULL, loginEnabled tinyint NOT NULL DEFAULT 0,
      createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (id),
      UNIQUE KEY UQ_user_emails_email (email), KEY IDX_user_emails_user_primary (userId, isPrimary),
      CONSTRAINT FK_user_emails_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await queryRunner.query(`INSERT INTO user_emails (id, email, userId, isPrimary, verifiedAt, loginEnabled, createdAt)
      SELECT UUID(), email, id, 1, COALESCE(emailVerifiedAt, createdAt), 1, createdAt FROM users`);
    await queryRunner.query(`CREATE TABLE user_email_challenges (
      id varchar(36) NOT NULL, userId varchar(36) NOT NULL, purpose varchar(32) NOT NULL, email varchar(255) NOT NULL,
      otpHash char(64) NOT NULL, expiresAt datetime(6) NOT NULL, verifiedAt datetime NULL, attempts int unsigned NOT NULL DEFAULT 0,
      lastSentAt datetime(6) NOT NULL, sendWindowStartedAt datetime(6) NOT NULL, sendCount int unsigned NOT NULL DEFAULT 1,
      createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      PRIMARY KEY (id), UNIQUE KEY UQ_user_email_challenge (userId, purpose)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  }
  async down(queryRunner: QueryRunner): Promise<void> { await queryRunner.query('DROP TABLE IF EXISTS user_email_challenges'); await queryRunner.query('DROP TABLE IF EXISTS user_emails'); }
}
