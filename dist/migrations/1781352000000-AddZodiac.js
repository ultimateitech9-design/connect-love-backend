"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AddZodiac1781352000000", {
    enumerable: true,
    get: function() {
        return AddZodiac1781352000000;
    }
});
let AddZodiac1781352000000 = class AddZodiac1781352000000 {
    async up(queryRunner) {
        await queryRunner.query('ALTER TABLE users ADD zodiac varchar(20) NULL');
    }
    async down(queryRunner) {
        await queryRunner.query('ALTER TABLE users DROP COLUMN zodiac');
    }
    constructor(){
        this.name = 'AddZodiac1781352000000';
    }
};

//# sourceMappingURL=1781352000000-AddZodiac.js.map