import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class RepairMessageActionColumns1785070000000 implements MigrationInterface {
  name = 'RepairMessageActionColumns1785070000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const columns = [
      new TableColumn({ name: 'reactions', type: 'text', isNullable: true }),
      new TableColumn({ name: 'deletedForUserIds', type: 'text', isNullable: true }),
      new TableColumn({ name: 'deletedForEveryone', type: 'tinyint', default: 0 }),
      new TableColumn({ name: 'pinnedByUserIds', type: 'text', isNullable: true }),
      new TableColumn({ name: 'starredByUserIds', type: 'text', isNullable: true }),
      new TableColumn({ name: 'replyToMessageId', type: 'varchar', length: '36', isNullable: true }),
      new TableColumn({ name: 'editedAt', type: 'datetime', isNullable: true }),
    ];

    for (const column of columns) {
      if (!(await queryRunner.hasColumn('messages', column.name))) {
        await queryRunner.addColumn('messages', column);
      }
    }
  }

  public async down(): Promise<void> {
    // This is a production schema repair. Do not remove columns that may have
    // existed before this migration or now contain user message-action data.
  }
}
