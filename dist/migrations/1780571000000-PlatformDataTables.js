"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "PlatformDataTables1780571000000", {
    enumerable: true,
    get: function() {
        return PlatformDataTables1780571000000;
    }
});
let PlatformDataTables1780571000000 = class PlatformDataTables1780571000000 {
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE subscription_plans (
        id varchar(36) NOT NULL,
        name varchar(120) NOT NULL,
        displayName varchar(120) NOT NULL,
        price decimal(10,2) NOT NULL DEFAULT 0,
        currency varchar(10) NOT NULL DEFAULT 'USD',
        features json NULL,
        status enum('active','inactive') NOT NULL DEFAULT 'active',
        sortOrder int NOT NULL DEFAULT 0,
        UNIQUE INDEX IDX_subscription_plans_name (name),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
        await queryRunner.query(`
      CREATE TABLE payments (
        id varchar(36) NOT NULL,
        userId varchar(36) NULL,
        planName varchar(120) NOT NULL,
        amount decimal(10,2) NOT NULL,
        currency varchar(10) NOT NULL DEFAULT 'USD',
        status enum('successful','pending','refunded','failed') NOT NULL DEFAULT 'pending',
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX IDX_payments_user (userId),
        INDEX IDX_payments_status (status),
        PRIMARY KEY (id),
        CONSTRAINT FK_payments_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
        await queryRunner.query(`
      CREATE TABLE verification_requests (
        id varchar(36) NOT NULL,
        userId varchar(36) NOT NULL,
        idType varchar(80) NOT NULL DEFAULT 'Government ID',
        priority enum('low','normal','high') NOT NULL DEFAULT 'normal',
        status enum('pending','under_review','approved','rejected') NOT NULL DEFAULT 'pending',
        documents json NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX IDX_verification_user (userId),
        INDEX IDX_verification_status (status),
        PRIMARY KEY (id),
        CONSTRAINT FK_verification_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
        await queryRunner.query(`
      CREATE TABLE platform_notifications (
        id varchar(36) NOT NULL,
        campaign varchar(160) NOT NULL,
        type varchar(40) NOT NULL,
        audience varchar(120) NOT NULL,
        status enum('draft','scheduled','active','sent','paused') NOT NULL DEFAULT 'draft',
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
        await queryRunner.query(`
      CREATE TABLE audit_logs (
        id varchar(36) NOT NULL,
        userId varchar(36) NULL,
        user varchar(150) NOT NULL,
        activity varchar(255) NOT NULL,
        ipAddress varchar(80) NOT NULL DEFAULT '127.0.0.1',
        action varchar(80) NOT NULL,
        module varchar(80) NOT NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
        await queryRunner.query(`
      CREATE TABLE platform_settings (
        \`key\` varchar(120) NOT NULL,
        value json NOT NULL,
        PRIMARY KEY (\`key\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
        await queryRunner.query(`
      CREATE TABLE platform_roles (
        id varchar(36) NOT NULL,
        role varchar(120) NOT NULL,
        permissions int NOT NULL DEFAULT 0,
        status varchar(30) NOT NULL DEFAULT 'Active',
        UNIQUE INDEX IDX_platform_roles_role (role),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    }
    async down(queryRunner) {
        await queryRunner.query('DROP TABLE IF EXISTS platform_roles');
        await queryRunner.query('DROP TABLE IF EXISTS platform_settings');
        await queryRunner.query('DROP TABLE IF EXISTS audit_logs');
        await queryRunner.query('DROP TABLE IF EXISTS platform_notifications');
        await queryRunner.query('DROP TABLE IF EXISTS verification_requests');
        await queryRunner.query('DROP TABLE IF EXISTS payments');
        await queryRunner.query('DROP TABLE IF EXISTS subscription_plans');
    }
    constructor(){
        this.name = 'PlatformDataTables1780571000000';
    }
};

//# sourceMappingURL=1780571000000-PlatformDataTables.js.map