"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "UserReligionField1781345000000", {
    enumerable: true,
    get: function() {
        return UserReligionField1781345000000;
    }
});
let UserReligionField1781345000000 = class UserReligionField1781345000000 {
    async up(queryRunner) {
        await queryRunner.query('ALTER TABLE users ADD religion varchar(100) NULL');
    }
    async down(queryRunner) {
        await queryRunner.query('ALTER TABLE users DROP COLUMN religion');
    }
    constructor(){
        this.name = 'UserReligionField1781345000000';
    }
};

//# sourceMappingURL=1781345000000-UserReligionField.js.map