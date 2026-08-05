import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class RazorpayPayments1785071000000 implements MigrationInterface {
  name = 'RazorpayPayments1785071000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const paymentColumns = [
      new TableColumn({ name: 'gateway', type: 'varchar', length: '30', default: "'razorpay'" }),
      new TableColumn({ name: 'gatewayOrderId', type: 'varchar', length: '80', isNullable: true, isUnique: true }),
      new TableColumn({ name: 'gatewayPaymentId', type: 'varchar', length: '80', isNullable: true, isUnique: true }),
    ];
    for (const column of paymentColumns) {
      if (!(await queryRunner.hasColumn('payments', column.name))) await queryRunner.addColumn('payments', column);
    }
    if (!(await queryRunner.hasColumn('users', 'planExpiresAt'))) {
      await queryRunner.addColumn('users', new TableColumn({ name: 'planExpiresAt', type: 'datetime', isNullable: true }));
    }
    if (await queryRunner.hasTable('subscription_plans')) {
      await queryRunner.query("UPDATE subscription_plans SET displayName = 'Free', price = 0, currency = 'INR' WHERE name = 'free'");
      await queryRunner.query("UPDATE subscription_plans SET displayName = 'Gold', price = 199, currency = 'INR' WHERE name = 'gold'");
      await queryRunner.query("UPDATE subscription_plans SET displayName = 'Diamond', price = 399, currency = 'INR' WHERE name = 'platinum'");
    }
  }

  public async down(): Promise<void> {
    // Preserve billing identifiers and expiry history once payment processing has started.
  }
}
