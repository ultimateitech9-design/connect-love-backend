import { MigrationInterface, QueryRunner } from 'typeorm';

export class NamedReferralCodes1795493100000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query('ALTER TABLE referral_codes ADD COLUMN legacyCode varchar(24) NULL, ADD UNIQUE INDEX UQ_referral_legacy_code (legacyCode)');
  }

  async down(q: QueryRunner): Promise<void> {
    // Restore previously shared codes before removing their compatibility alias.
    await q.query('UPDATE referral_codes SET code = legacyCode WHERE legacyCode IS NOT NULL');
    await q.query('ALTER TABLE referral_codes DROP INDEX UQ_referral_legacy_code, DROP COLUMN legacyCode');
  }
}
