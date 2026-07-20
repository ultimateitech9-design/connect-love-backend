import { MigrationInterface, QueryRunner } from 'typeorm';

export class EmailRegistrationOtps1781354000000 implements MigrationInterface {
  name = 'EmailRegistrationOtps1781354000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE users ADD COLUMN emailVerifiedAt timestamp NULL');
    await queryRunner.query(`
      CREATE TABLE email_registration_otps (
        email varchar(255) NOT NULL,
        otpHash char(64) NOT NULL,
        expiresAt datetime(6) NOT NULL,
        attempts int unsigned NOT NULL DEFAULT 0,
        lastSentAt datetime(6) NOT NULL,
        sendWindowStartedAt datetime(6) NOT NULL,
        sendCount int unsigned NOT NULL DEFAULT 1,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (email),
        INDEX IDX_email_registration_otps_expires (expiresAt)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS email_registration_otps');
    await queryRunner.query('ALTER TABLE users DROP COLUMN emailVerifiedAt');
  }
}
