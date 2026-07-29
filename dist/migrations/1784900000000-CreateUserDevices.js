"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "CreateUserDevices1784900000000", {
    enumerable: true,
    get: function() {
        return CreateUserDevices1784900000000;
    }
});
let CreateUserDevices1784900000000 = class CreateUserDevices1784900000000 {
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE user_devices (
        id varchar(36) NOT NULL,
        userId varchar(36) NOT NULL,
        token varchar(512) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
        platform varchar(20) NOT NULL DEFAULT 'unknown',
        deviceId varchar(191) NULL,
        deviceName varchar(100) NULL,
        appVersion varchar(50) NULL,
        isActive tinyint NOT NULL DEFAULT 1,
        lastSeenAt datetime(6) NOT NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX IDX_user_devices_token (token),
        INDEX IDX_user_devices_user_active (userId, isActive),
        INDEX IDX_user_devices_user_device (userId, deviceId),
        PRIMARY KEY (id),
        CONSTRAINT FK_user_devices_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    }
    async down(queryRunner) {
        await queryRunner.query('DROP TABLE IF EXISTS user_devices');
    }
    constructor(){
        this.name = 'CreateUserDevices1784900000000';
    }
};

//# sourceMappingURL=1784900000000-CreateUserDevices.js.map