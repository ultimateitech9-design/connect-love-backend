import { MigrationInterface, QueryRunner } from 'typeorm';

export class IndexUsersCreatedAt1781338500000 implements MigrationInterface {
  name = 'IndexUsersCreatedAt1781338500000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE INDEX IDX_users_createdAt ON users (createdAt)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IDX_users_createdAt ON users');
  }
}
