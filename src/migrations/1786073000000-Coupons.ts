import { MigrationInterface, QueryRunner, Table, TableColumn } from 'typeorm';

export class Coupons1786073000000 implements MigrationInterface {
  name = 'Coupons1786073000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('coupons'))) await queryRunner.createTable(new Table({ name: 'coupons', columns: [
      { name: 'id', type: 'varchar', length: '36', isPrimary: true },
      { name: 'code', type: 'varchar', length: '32', isUnique: true },
      { name: 'discountPercent', type: 'int', unsigned: true },
      { name: 'applicablePlan', type: 'enum', enum: ['all', 'gold', 'platinum'], default: "'all'" },
      { name: 'expiresAt', type: 'datetime', isNullable: true },
      { name: 'maxUses', type: 'int', unsigned: true, isNullable: true },
      { name: 'usedCount', type: 'int', unsigned: true, default: 0 },
      { name: 'active', type: 'tinyint', width: 1, default: 1 },
      { name: 'createdAt', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)' },
      { name: 'updatedAt', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)' },
    ] }));
    const additions = [
      new TableColumn({ name: 'originalAmount', type: 'decimal', precision: 10, scale: 2, isNullable: true }),
      new TableColumn({ name: 'discountAmount', type: 'decimal', precision: 10, scale: 2, default: 0 }),
      new TableColumn({ name: 'couponCode', type: 'varchar', length: '32', isNullable: true }),
    ];
    for (const column of additions) if (!(await queryRunner.hasColumn('payments', column.name))) await queryRunner.addColumn('payments', column);
  }
  async down(): Promise<void> { /* Preserve coupon and payment audit history. */ }
}
