import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * One-time operational reset requested for the live wallet launch.
 * Both spendable/recharged coins and withdrawable gift earnings must be reset;
 * ledger rows stay intact for audit and payment history.
 */
export class ResetAllUserCoinBalances1786074000000 implements MigrationInterface {
  name = 'ResetAllUserCoinBalances1786074000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('UPDATE `users` SET `coinBalance` = 0, `earnedCoinBalance` = 0');
  }

  public async down(): Promise<void> {
    // A balance reset is intentionally irreversible: the prior balances are
    // retained only in the immutable coin transaction ledger.
  }
}
