"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "UserPhotoKycFields1781341000000", {
    enumerable: true,
    get: function() {
        return UserPhotoKycFields1781341000000;
    }
});
let UserPhotoKycFields1781341000000 = class UserPhotoKycFields1781341000000 {
    async up(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN kycLivePhoto longtext NULL,
      ADD COLUMN kycMatched tinyint NOT NULL DEFAULT 0,
      ADD COLUMN kycVerifiedAt timestamp NULL
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE users
      DROP COLUMN kycVerifiedAt,
      DROP COLUMN kycMatched,
      DROP COLUMN kycLivePhoto
    `);
    }
    constructor(){
        this.name = 'UserPhotoKycFields1781341000000';
    }
};

//# sourceMappingURL=1781341000000-UserPhotoKycFields.js.map