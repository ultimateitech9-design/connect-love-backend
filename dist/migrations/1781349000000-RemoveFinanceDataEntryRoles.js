"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "RemoveFinanceDataEntryRoles1781349000000", {
    enumerable: true,
    get: function() {
        return RemoveFinanceDataEntryRoles1781349000000;
    }
});
const ACTIVE_ROLE_TABLES = [
    [
        'user',
        'dating_user_profiles'
    ],
    [
        'admin',
        'admin_profiles'
    ],
    [
        'super_admin',
        'super_admin_profiles'
    ],
    [
        'sales',
        'sales_profiles'
    ],
    [
        'support',
        'support_profiles'
    ],
    [
        'marketing',
        'marketing_profiles'
    ]
];
const ALL_ROLE_TABLES = [
    ...ACTIVE_ROLE_TABLES,
    [
        'finance',
        'finance_profiles'
    ],
    [
        'data_entry',
        'data_entry_profiles'
    ]
];
async function replaceRoleTriggers(queryRunner, roleTables) {
    await queryRunner.query('DROP TRIGGER IF EXISTS TRG_users_role_profiles_update');
    await queryRunner.query('DROP TRIGGER IF EXISTS TRG_users_role_profiles_insert');
    const insertStatements = roleTables.map(([role, table], index)=>`${index === 0 ? 'IF' : 'ELSEIF'} NEW.role = '${role}' THEN INSERT IGNORE INTO ${table} (userId) VALUES (NEW.id);`).join(' ');
    await queryRunner.query(`CREATE TRIGGER TRG_users_role_profiles_insert
    AFTER INSERT ON users FOR EACH ROW
    BEGIN ${insertStatements} END IF; END`);
    const clearStatements = roleTables.map(([, table])=>`DELETE FROM ${table} WHERE userId = NEW.id;`).join(' ');
    const updateStatements = roleTables.map(([role, table], index)=>`${index === 0 ? 'IF' : 'ELSEIF'} NEW.role = '${role}' THEN INSERT IGNORE INTO ${table} (userId) VALUES (NEW.id);`).join(' ');
    await queryRunner.query(`CREATE TRIGGER TRG_users_role_profiles_update
    AFTER UPDATE ON users FOR EACH ROW
    BEGIN
      IF NOT (OLD.role <=> NEW.role) THEN
        ${clearStatements}
        ${updateStatements} END IF;
      END IF;
    END`);
}
let RemoveFinanceDataEntryRoles1781349000000 = class RemoveFinanceDataEntryRoles1781349000000 {
    async up(queryRunner) {
        await queryRunner.query('DROP TRIGGER IF EXISTS TRG_users_role_profiles_update');
        await queryRunner.query('DROP TRIGGER IF EXISTS TRG_users_role_profiles_insert');
        await queryRunner.query("DELETE FROM users WHERE role IN ('finance', 'data_entry')");
        await queryRunner.query('DROP TABLE IF EXISTS finance_profiles');
        await queryRunner.query('DROP TABLE IF EXISTS data_entry_profiles');
        await queryRunner.query("ALTER TABLE users MODIFY role enum('user','admin','super_admin','marketing','sales','support') NOT NULL DEFAULT 'user'");
        await replaceRoleTriggers(queryRunner, ACTIVE_ROLE_TABLES);
    }
    async down(queryRunner) {
        await queryRunner.query('DROP TRIGGER IF EXISTS TRG_users_role_profiles_update');
        await queryRunner.query('DROP TRIGGER IF EXISTS TRG_users_role_profiles_insert');
        await queryRunner.query("ALTER TABLE users MODIFY role enum('user','admin','super_admin','marketing','data_entry','finance','sales','support') NOT NULL DEFAULT 'user'");
        for (const table of [
            'finance_profiles',
            'data_entry_profiles'
        ]){
            await queryRunner.query(`CREATE TABLE ${table} (
        userId varchar(36) NOT NULL,
        metadata json NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (userId),
        CONSTRAINT FK_${table}_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
        }
        await replaceRoleTriggers(queryRunner, ALL_ROLE_TABLES);
    }
    constructor(){
        this.name = 'RemoveFinanceDataEntryRoles1781349000000';
    }
};

//# sourceMappingURL=1781349000000-RemoveFinanceDataEntryRoles.js.map