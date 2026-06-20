import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserKycMatchScore1781342000000 implements MigrationInterface {
  name = 'UserKycMatchScore1781342000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN kycMatchScore int NULL AFTER kycMatched
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      DROP COLUMN kycMatchScore
    `);
  }
}
