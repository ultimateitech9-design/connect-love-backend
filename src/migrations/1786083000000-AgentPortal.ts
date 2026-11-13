import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgentPortal1786083000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE agents (
      id varchar(36) NOT NULL PRIMARY KEY,
      name varchar(150) NOT NULL,
      email varchar(255) NOT NULL UNIQUE,
      password varchar(255) NOT NULL,
      sessionVersion int NOT NULL DEFAULT 0,
      createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
    ) ENGINE=InnoDB`);
    await queryRunner.query(`CREATE TABLE agent_email_challenges (
      id varchar(36) NOT NULL PRIMARY KEY,
      email varchar(255) NOT NULL,
      purpose varchar(16) NOT NULL,
      codeHash varchar(64) NOT NULL,
      expiresAt datetime NOT NULL,
      sentAt datetime NOT NULL,
      attempts int NOT NULL DEFAULT 0,
      sends int NOT NULL DEFAULT 1,
      windowStartedAt datetime NOT NULL,
      UNIQUE KEY UQ_agent_challenge (email, purpose)
    ) ENGINE=InnoDB`);
    await queryRunner.query('ALTER TABLE users ADD COLUMN createdByAgentId varchar(36) NULL, ADD INDEX IDX_users_agent (createdByAgentId, createdAt), ADD CONSTRAINT FK_users_agent FOREIGN KEY (createdByAgentId) REFERENCES agents(id) ON DELETE SET NULL');
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE users DROP FOREIGN KEY FK_users_agent, DROP INDEX IDX_users_agent, DROP COLUMN createdByAgentId');
    await queryRunner.query('DROP TABLE agent_email_challenges');
    await queryRunner.query('DROP TABLE agents');
  }
}
