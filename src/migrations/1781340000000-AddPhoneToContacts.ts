import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPhoneToContacts1781340000000 implements MigrationInterface {
  name = 'AddContactDetailsToContacts1781340000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE contacts ADD COLUMN phone varchar(40) NULL AFTER email');
    await queryRunner.query('ALTER TABLE contacts ADD COLUMN photo_data_url longtext NULL AFTER message');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE contacts DROP COLUMN photo_data_url');
    await queryRunner.query('ALTER TABLE contacts DROP COLUMN phone');
  }
}
