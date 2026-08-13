import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class WalletGatewayReferences1786075000000 implements MigrationInterface {
  name = 'WalletGatewayReferences1786075000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const columns = [
      new TableColumn({ name: 'amountPaise', type: 'int', unsigned: true, isNullable: true }),
      new TableColumn({ name: 'gatewayOrderId', type: 'varchar', length: '100', isNullable: true, isUnique: true }),
      new TableColumn({ name: 'gatewayPaymentId', type: 'varchar', length: '100', isNullable: true, isUnique: true }),
      new TableColumn({ name: 'gatewayPayoutId', type: 'varchar', length: '100', isNullable: true, isUnique: true }),
    ];
    for (const column of columns) {
      if (!(await queryRunner.hasColumn('coin_transactions', column.name))) await queryRunner.addColumn('coin_transactions', column);
    }
  }

  public async down(): Promise<void> {}
}
