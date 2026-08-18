import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class ChatConversationVisibility1786076000000 implements MigrationInterface {
  name = 'ChatConversationVisibility1786076000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('matches', 'hiddenFromChatForUserIds'))) {
      await queryRunner.addColumn('matches', new TableColumn({
        name: 'hiddenFromChatForUserIds',
        type: 'text',
        isNullable: true,
      }));
    }
  }

  public async down(): Promise<void> {}
}