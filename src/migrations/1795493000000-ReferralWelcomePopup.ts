import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReferralWelcomePopup1795493000000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query('ALTER TABLE users ADD COLUMN referralWelcomePending tinyint NOT NULL DEFAULT 0');
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query('ALTER TABLE users DROP COLUMN referralWelcomePending');
  }
}
