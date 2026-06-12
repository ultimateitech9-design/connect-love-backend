import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserSignupLocation1780573000000 implements MigrationInterface {
  name = 'UserSignupLocation1780573000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const usersTable = await queryRunner.getTable('users');

    if (usersTable && !usersTable.findColumnByName('locationLatitude')) {
      await queryRunner.query('ALTER TABLE users ADD locationLatitude double NULL AFTER city');
    }

    if (usersTable && !usersTable.findColumnByName('locationLongitude')) {
      await queryRunner.query('ALTER TABLE users ADD locationLongitude double NULL AFTER locationLatitude');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const usersTable = await queryRunner.getTable('users');

    if (usersTable?.findColumnByName('locationLongitude')) {
      await queryRunner.query('ALTER TABLE users DROP COLUMN locationLongitude');
    }

    if (usersTable?.findColumnByName('locationLatitude')) {
      await queryRunner.query('ALTER TABLE users DROP COLUMN locationLatitude');
    }
  }
}
