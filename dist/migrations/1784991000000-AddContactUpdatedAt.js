"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AddContactUpdatedAt1784991000000", {
    enumerable: true,
    get: function() {
        return AddContactUpdatedAt1784991000000;
    }
});
let AddContactUpdatedAt1784991000000 = class AddContactUpdatedAt1784991000000 {
    async up(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE contacts
        ADD updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
    `);
    }
    async down(queryRunner) {
        await queryRunner.query('ALTER TABLE contacts DROP updatedAt');
    }
    constructor(){
        this.name = 'AddContactUpdatedAt1784991000000';
    }
};

//# sourceMappingURL=1784991000000-AddContactUpdatedAt.js.map