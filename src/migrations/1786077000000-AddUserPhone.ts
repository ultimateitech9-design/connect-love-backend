import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddUserPhone1786077000000 implements MigrationInterface {
  name = 'AddUserPhone1786077000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');
    if (!table?.findColumnByName('phone')) {
      await queryRunner.addColumn('users', new TableColumn({
        name: 'phone',
        type: 'varchar',
        length: '30',
        isNullable: true,
      }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');
    if (table?.findColumnByName('phone')) await queryRunner.dropColumn('users', 'phone');
  }
}
