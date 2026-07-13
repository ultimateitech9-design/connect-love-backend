import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddZodiac1781352000000 implements MigrationInterface {
  name = 'AddZodiac1781352000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE users ADD zodiac varchar(20) NULL');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE users DROP COLUMN zodiac');
  }
}
