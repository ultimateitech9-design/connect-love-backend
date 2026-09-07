import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeactivatedUserStatus1786079000000 implements MigrationInterface {
  name = 'AddDeactivatedUserStatus1786079000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users MODIFY status enum('active','deactivated','suspended','banned','pending_verification') NOT NULL DEFAULT 'active'`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE users SET status = 'suspended' WHERE status = 'deactivated'`);
    await queryRunner.query(`ALTER TABLE users MODIFY status enum('active','suspended','banned','pending_verification') NOT NULL DEFAULT 'active'`);
  }
}
