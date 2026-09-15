import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddWithdrawalPayoutDetails1786082000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('coin_transactions');
    if (table && !table.findColumnByName('payoutDetails')) await queryRunner.addColumn('coin_transactions', new TableColumn({ name: 'payoutDetails', type: 'text', isNullable: true }));
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('coin_transactions');
    if (table?.findColumnByName('payoutDetails')) await queryRunner.dropColumn('coin_transactions', 'payoutDetails');
  }
}
