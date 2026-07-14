import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserCoinBalance1781353000000 implements MigrationInterface {
  name = 'AddUserCoinBalance1781353000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE users ADD coinBalance INT UNSIGNED NOT NULL DEFAULT 0');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE users DROP COLUMN coinBalance');
  }
}
