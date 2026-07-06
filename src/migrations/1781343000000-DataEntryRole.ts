import { MigrationInterface, QueryRunner } from 'typeorm';

export class DataEntryRole1781343000000 implements MigrationInterface {
  name = 'DataEntryRole1781343000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      MODIFY role enum('user','admin','super_admin','marketing','data_entry','finance','sales','support') NOT NULL DEFAULT 'user'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      MODIFY role enum('user','admin','super_admin','marketing','finance','sales','support') NOT NULL DEFAULT 'user'
    `);
  }
}
