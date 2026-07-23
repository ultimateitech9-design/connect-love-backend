import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContactUpdatedAt1784991000000 implements MigrationInterface {
  name = 'AddContactUpdatedAt1784991000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE contacts
        ADD updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE contacts DROP updatedAt');
  }
}
