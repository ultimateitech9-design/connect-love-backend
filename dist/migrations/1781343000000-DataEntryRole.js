"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "DataEntryRole1781343000000", {
    enumerable: true,
    get: function() {
        return DataEntryRole1781343000000;
    }
});
let DataEntryRole1781343000000 = class DataEntryRole1781343000000 {
    async up(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE users
      MODIFY role enum('user','admin','super_admin','marketing','data_entry','finance','sales','support') NOT NULL DEFAULT 'user'
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE users
      MODIFY role enum('user','admin','super_admin','marketing','finance','sales','support') NOT NULL DEFAULT 'user'
    `);
    }
    constructor(){
        this.name = 'DataEntryRole1781343000000';
    }
};

//# sourceMappingURL=1781343000000-DataEntryRole.js.map