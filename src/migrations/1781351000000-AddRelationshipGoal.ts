import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRelationshipGoal1781351000000 implements MigrationInterface {
  name = 'AddRelationshipGoal1781351000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE users ADD relationshipGoal varchar(30) NULL');
    await queryRunner.query('CREATE INDEX IDX_users_relationship_goal ON users (relationshipGoal)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IDX_users_relationship_goal ON users');
    await queryRunner.query('ALTER TABLE users DROP COLUMN relationshipGoal');
  }
}
