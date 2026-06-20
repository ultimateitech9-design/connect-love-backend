"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "UserKycMatchScore1781342000000", {
    enumerable: true,
    get: function() {
        return UserKycMatchScore1781342000000;
    }
});
let UserKycMatchScore1781342000000 = class UserKycMatchScore1781342000000 {
    async up(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN kycMatchScore int NULL AFTER kycMatched
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE users
      DROP COLUMN kycMatchScore
    `);
    }
    constructor(){
        this.name = 'UserKycMatchScore1781342000000';
    }
};

//# sourceMappingURL=1781342000000-UserKycMatchScore.js.map