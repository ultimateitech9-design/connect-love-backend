import { MigrationInterface, QueryRunner } from 'typeorm';

// Coupons can now be made for wallet coin recharges ('coins').
export class WalletCoupons1786181000000 implements MigrationInterface {
  name = 'WalletCoupons1786181000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE coupons MODIFY applicablePlan enum('all','gold','platinum','coins') NOT NULL DEFAULT 'all'");
    if (!(await queryRunner.hasColumn('coin_transactions', 'couponCode'))) {
      await queryRunner.query('ALTER TABLE coin_transactions ADD couponCode varchar(32) NULL, ADD discountPaise int unsigned NOT NULL DEFAULT 0');
    }
  }
  async down(): Promise<void> { /* Keep coupon history. */ }
}
