import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserSessionAuditFields1781337600000 implements MigrationInterface {
  name = 'UserSessionAuditFields1781337600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE audit_logs
        ADD sessionId varchar(36) NULL,
        ADD role varchar(40) NULL,
        ADD device varchar(255) NULL,
        ADD loginAt datetime NULL,
        ADD lastActivityAt datetime NULL,
        ADD logoutAt datetime NULL,
        ADD durationSeconds int NULL,
        ADD UNIQUE INDEX IDX_audit_logs_sessionId (sessionId)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE audit_logs
        DROP INDEX IDX_audit_logs_sessionId,
        DROP COLUMN durationSeconds,
        DROP COLUMN logoutAt,
        DROP COLUMN lastActivityAt,
        DROP COLUMN loginAt,
        DROP COLUMN device,
        DROP COLUMN role,
        DROP COLUMN sessionId
    `);
  }
}
