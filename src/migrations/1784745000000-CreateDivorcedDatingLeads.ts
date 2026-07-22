import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDivorcedDatingLeads1784745000000 implements MigrationInterface {
  name = 'CreateDivorcedDatingLeads1784745000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE divorced_dating_leads (
        id int NOT NULL AUTO_INCREMENT,
        relationshipGoal varchar(40) NOT NULL,
        ageRange varchar(20) NOT NULL,
        city varchar(120) NOT NULL,
        childrenPreference varchar(40) NOT NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS divorced_dating_leads');
  }
}
