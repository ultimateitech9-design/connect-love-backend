import { MigrationInterface, QueryRunner } from 'typeorm';

export class WelcomeMembershipCoupon1795248000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(
      "INSERT INTO coupons (id, code, discountPercent, applicablePlan, active) VALUES (UUID(), 'CONNECTLOVE', 30, 'all', 1) ON DUPLICATE KEY UPDATE discountPercent = 30, applicablePlan = 'all', active = 1",
    );
  }

  async down(): Promise<void> { /* Preserve coupon redemption history. */ }
}
