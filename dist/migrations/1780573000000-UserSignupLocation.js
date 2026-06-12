"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "UserSignupLocation1780573000000", {
    enumerable: true,
    get: function() {
        return UserSignupLocation1780573000000;
    }
});
let UserSignupLocation1780573000000 = class UserSignupLocation1780573000000 {
    async up(queryRunner) {
        const usersTable = await queryRunner.getTable('users');
        if (usersTable && !usersTable.findColumnByName('locationLatitude')) {
            await queryRunner.query('ALTER TABLE users ADD locationLatitude double NULL AFTER city');
        }
        if (usersTable && !usersTable.findColumnByName('locationLongitude')) {
            await queryRunner.query('ALTER TABLE users ADD locationLongitude double NULL AFTER locationLatitude');
        }
    }
    async down(queryRunner) {
        const usersTable = await queryRunner.getTable('users');
        if (usersTable?.findColumnByName('locationLongitude')) {
            await queryRunner.query('ALTER TABLE users DROP COLUMN locationLongitude');
        }
        if (usersTable?.findColumnByName('locationLatitude')) {
            await queryRunner.query('ALTER TABLE users DROP COLUMN locationLatitude');
        }
    }
    constructor(){
        this.name = 'UserSignupLocation1780573000000';
    }
};

//# sourceMappingURL=1780573000000-UserSignupLocation.js.map