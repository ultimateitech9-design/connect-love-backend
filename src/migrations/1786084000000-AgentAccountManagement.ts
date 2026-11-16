import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AgentAccountManagement1786084000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('agents', [
      new TableColumn({ name: 'status', type: 'enum', enum: ['active', 'banned', 'deleted'], default: "'active'" }),
      new TableColumn({ name: 'deletedAt', type: 'datetime', isNullable: true }),
    ]);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('agents', 'deletedAt');
    await queryRunner.dropColumn('agents', 'status');
  }
}
