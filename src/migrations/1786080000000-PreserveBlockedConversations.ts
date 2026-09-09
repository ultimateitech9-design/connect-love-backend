import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class PreserveBlockedConversations1786080000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('matches', 'blockedByUserId'))) {
      await queryRunner.addColumn('matches', new TableColumn({
        name: 'blockedByUserId',
        type: 'varchar',
        length: '36',
        isNullable: true,
      }));
    }
    if (!(await queryRunner.hasColumn('matches', 'statusBeforeBlock'))) {
      await queryRunner.addColumn('matches', new TableColumn({
        name: 'statusBeforeBlock',
        type: 'enum',
        enum: ['PENDING', 'MATCHED', 'DECLINED', 'BLOCKED'],
        isNullable: true,
      }));
    }

    // Older block records stored the blocker as sender and deleted the row on
    // unblock. Mark those rows so they can now be restored without losing chat.
    await queryRunner.query(
      "UPDATE matches SET blockedByUserId = senderId, statusBeforeBlock = 'MATCHED' WHERE status = 'BLOCKED' AND blockedByUserId IS NULL",
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('matches', 'statusBeforeBlock')) {
      await queryRunner.dropColumn('matches', 'statusBeforeBlock');
    }
    if (await queryRunner.hasColumn('matches', 'blockedByUserId')) {
      await queryRunner.dropColumn('matches', 'blockedByUserId');
    }
  }
}