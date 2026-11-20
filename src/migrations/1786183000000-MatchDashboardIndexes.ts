import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

export class MatchDashboardIndexes1786183000000 implements MigrationInterface {
  name = 'MatchDashboardIndexes1786183000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('matches');
    for (const [name, columnNames] of [
      ['IDX_matches_sender_kind_page', ['senderId', 'status', 'isSuperLike', 'createdAt', 'id']],
      ['IDX_matches_blocker_page', ['blockedByUserId', 'status', 'createdAt', 'id']],
    ] as const) {
      if (!table?.indices.some(index => index.name === name)) {
        await queryRunner.createIndex('matches', new TableIndex({ name, columnNames: [...columnNames] }));
      }
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('matches');
    for (const name of ['IDX_matches_blocker_page', 'IDX_matches_sender_kind_page']) {
      if (table?.indices.some(index => index.name === name)) await queryRunner.dropIndex('matches', name);
    }
  }
}
