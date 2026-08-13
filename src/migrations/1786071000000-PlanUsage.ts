import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class PlanUsage1786071000000 implements MigrationInterface {
  name = 'PlanUsage1786071000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('plan_usage')) return;
    await queryRunner.createTable(new Table({ name: 'plan_usage', columns: [
      { name: 'id', type: 'varchar', length: '36', isPrimary: true },
      { name: 'userId', type: 'varchar', length: '255' },
      { name: 'action', type: 'varchar', length: '40' },
      { name: 'targetId', type: 'varchar', length: '255', isNullable: true },
      { name: 'createdAt', type: 'datetime', precision: 6, default: 'CURRENT_TIMESTAMP(6)' },
    ] }));
    await queryRunner.createIndex('plan_usage', new TableIndex({ name: 'IDX_plan_usage_user_action_created', columnNames: ['userId', 'action', 'createdAt'] }));
    if (await queryRunner.hasTable('subscription_plans')) {
      await queryRunner.query("UPDATE subscription_plans SET displayName = 'Free', price = 0, currency = 'INR' WHERE name = 'free'");
      await queryRunner.query("UPDATE subscription_plans SET displayName = 'Gold', price = 299, currency = 'INR' WHERE name = 'gold'");
      await queryRunner.query("UPDATE subscription_plans SET displayName = 'Diamond', price = 499, currency = 'INR' WHERE name = 'platinum'");
    }
  }
  async down(queryRunner: QueryRunner): Promise<void> { if (await queryRunner.hasTable('plan_usage')) await queryRunner.dropTable('plan_usage'); }
}
