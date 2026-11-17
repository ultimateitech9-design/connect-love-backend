import { MigrationInterface, QueryRunner } from 'typeorm';

// Saved bank/UPI accounts for withdrawals by users and agents (see src/payouts).
export class PayoutAccounts1786179000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE payout_accounts (
      id char(36) NOT NULL,
      ownerType enum('user','agent') NOT NULL,
      ownerId char(36) NOT NULL,
      method enum('bank','upi') NOT NULL,
      accountHolder varchar(120) NULL,
      bankName varchar(120) NULL,
      ifsc varchar(11) NULL,
      accountNumberEncrypted text NULL,
      accountNumberLast4 varchar(4) NULL,
      upiId varchar(255) NULL,
      createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      PRIMARY KEY (id),
      KEY IDX_payout_accounts_owner (ownerType, ownerId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE payout_accounts');
  }
}
