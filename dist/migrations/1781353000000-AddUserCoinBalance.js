"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AddUserCoinBalance1781353000000", {
    enumerable: true,
    get: function() {
        return AddUserCoinBalance1781353000000;
    }
});
let AddUserCoinBalance1781353000000 = class AddUserCoinBalance1781353000000 {
    async up(queryRunner) {
        await queryRunner.query('ALTER TABLE users ADD coinBalance INT UNSIGNED NOT NULL DEFAULT 0');
    }
    async down(queryRunner) {
        await queryRunner.query('ALTER TABLE users DROP COLUMN coinBalance');
    }
    constructor(){
        this.name = 'AddUserCoinBalance1781353000000';
    }
};

//# sourceMappingURL=1781353000000-AddUserCoinBalance.js.map