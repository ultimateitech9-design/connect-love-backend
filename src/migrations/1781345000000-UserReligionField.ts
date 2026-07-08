import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserReligionField1781345000000 implements MigrationInterface {
  name = 'UserReligionField1781345000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE users ADD religion varchar(100) NULL');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE users DROP COLUMN religion');
  }
}
