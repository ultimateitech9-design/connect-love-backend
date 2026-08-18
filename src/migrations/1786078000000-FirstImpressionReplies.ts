import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class FirstImpressionReplies1786078000000 implements MigrationInterface {
  name = 'FirstImpressionReplies1786078000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('first_impressions');
    if (!table?.findColumnByName('replyMessageId')) {
      await queryRunner.addColumn('first_impressions', new TableColumn({
        name: 'replyMessageId', type: 'varchar', length: '36', isNullable: true,
      }));
    }
    const updated = await queryRunner.getTable('first_impressions');
    if (!updated?.findColumnByName('repliedAt')) {
      await queryRunner.addColumn('first_impressions', new TableColumn({
        name: 'repliedAt', type: 'datetime', isNullable: true,
      }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('first_impressions');
    if (table?.findColumnByName('repliedAt')) await queryRunner.dropColumn('first_impressions', 'repliedAt');
    const updated = await queryRunner.getTable('first_impressions');
    if (updated?.findColumnByName('replyMessageId')) await queryRunner.dropColumn('first_impressions', 'replyMessageId');
  }
}
