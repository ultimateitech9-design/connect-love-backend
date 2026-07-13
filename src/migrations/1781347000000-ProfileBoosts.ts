import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProfileBoosts1781347000000 implements MigrationInterface {
  name = 'ProfileBoosts1781347000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE profile_boosts (
      id varchar(36) NOT NULL, userId varchar(36) NOT NULL, requestId varchar(36) NOT NULL,
      planKey varchar(30) NOT NULL, amount int NOT NULL, currency varchar(3) NOT NULL DEFAULT 'INR',
      startsAt datetime NOT NULL, endsAt datetime NOT NULL,
      createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (id),
      UNIQUE INDEX UQ_profile_boosts_user_request (userId, requestId),
      INDEX IDX_profile_boosts_user_ends (userId, endsAt),
      CONSTRAINT FK_profile_boosts_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  }
  async down(queryRunner: QueryRunner): Promise<void> { await queryRunner.query('DROP TABLE IF EXISTS profile_boosts'); }
}
