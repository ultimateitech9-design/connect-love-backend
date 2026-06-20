import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserPhotoKycFields1781341000000 implements MigrationInterface {
  name = 'UserPhotoKycFields1781341000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN kycLivePhoto longtext NULL,
      ADD COLUMN kycMatched tinyint NOT NULL DEFAULT 0,
      ADD COLUMN kycVerifiedAt timestamp NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      DROP COLUMN kycVerifiedAt,
      DROP COLUMN kycMatched,
      DROP COLUMN kycLivePhoto
    `);
  }
}
