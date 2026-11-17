import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgentUserEmailChangeNotice1786177000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> { await queryRunner.query('ALTER TABLE users ADD COLUMN agentEmailChangedAt datetime NULL AFTER createdByAgentId'); }
  async down(queryRunner: QueryRunner): Promise<void> { await queryRunner.query('ALTER TABLE users DROP COLUMN agentEmailChangedAt'); }
}
