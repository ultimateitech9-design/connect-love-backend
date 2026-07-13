import { MigrationInterface, QueryRunner } from 'typeorm';

const ROLE_TABLES = [
  ['user', 'dating_user_profiles'],
  ['admin', 'admin_profiles'],
  ['super_admin', 'super_admin_profiles'],
  ['sales', 'sales_profiles'],
  ['support', 'support_profiles'],
  ['marketing', 'marketing_profiles'],
  ['finance', 'finance_profiles'],
  ['data_entry', 'data_entry_profiles'],
] as const;

export class RoleProfileTables1781348000000 implements MigrationInterface {
  name = 'RoleProfileTables1781348000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const [, table] of ROLE_TABLES) {
      await queryRunner.query(`CREATE TABLE ${table} (
        userId varchar(36) NOT NULL,
        metadata json NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (userId),
        CONSTRAINT FK_${table}_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    }

    for (const [role, table] of ROLE_TABLES) {
      await queryRunner.query(`INSERT INTO ${table} (userId)
        SELECT id FROM users WHERE role = '${role}'`);
    }

    const insertStatements = ROLE_TABLES.map(([role, table], index) =>
      `${index === 0 ? 'IF' : 'ELSEIF'} NEW.role = '${role}' THEN INSERT IGNORE INTO ${table} (userId) VALUES (NEW.id);`,
    ).join(' ');
    await queryRunner.query(`CREATE TRIGGER TRG_users_role_profiles_insert
      AFTER INSERT ON users FOR EACH ROW
      BEGIN ${insertStatements} END IF; END`);

    const clearStatements = ROLE_TABLES.map(([, table]) => `DELETE FROM ${table} WHERE userId = NEW.id;`).join(' ');
    const updateStatements = ROLE_TABLES.map(([role, table], index) =>
      `${index === 0 ? 'IF' : 'ELSEIF'} NEW.role = '${role}' THEN INSERT IGNORE INTO ${table} (userId) VALUES (NEW.id);`,
    ).join(' ');
    await queryRunner.query(`CREATE TRIGGER TRG_users_role_profiles_update
      AFTER UPDATE ON users FOR EACH ROW
      BEGIN
        IF NOT (OLD.role <=> NEW.role) THEN
          ${clearStatements}
          ${updateStatements} END IF;
        END IF;
      END`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TRIGGER IF EXISTS TRG_users_role_profiles_update');
    await queryRunner.query('DROP TRIGGER IF EXISTS TRG_users_role_profiles_insert');
    for (const [, table] of [...ROLE_TABLES].reverse()) {
      await queryRunner.query(`DROP TABLE IF EXISTS ${table}`);
    }
  }
}
