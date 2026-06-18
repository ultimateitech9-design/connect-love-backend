"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AddPhoneToContacts1781340000000", {
    enumerable: true,
    get: function() {
        return AddPhoneToContacts1781340000000;
    }
});
let AddPhoneToContacts1781340000000 = class AddPhoneToContacts1781340000000 {
    async up(queryRunner) {
        await queryRunner.query('ALTER TABLE contacts ADD COLUMN phone varchar(40) NULL AFTER email');
        await queryRunner.query('ALTER TABLE contacts ADD COLUMN photo_data_url longtext NULL AFTER message');
    }
    async down(queryRunner) {
        await queryRunner.query('ALTER TABLE contacts DROP COLUMN photo_data_url');
        await queryRunner.query('ALTER TABLE contacts DROP COLUMN phone');
    }
    constructor(){
        this.name = 'AddContactDetailsToContacts1781340000000';
    }
};

//# sourceMappingURL=1781340000000-AddPhoneToContacts.js.map