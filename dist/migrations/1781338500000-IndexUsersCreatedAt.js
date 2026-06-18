"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "IndexUsersCreatedAt1781338500000", {
    enumerable: true,
    get: function() {
        return IndexUsersCreatedAt1781338500000;
    }
});
let IndexUsersCreatedAt1781338500000 = class IndexUsersCreatedAt1781338500000 {
    async up(queryRunner) {
        await queryRunner.query('CREATE INDEX IDX_users_createdAt ON users (createdAt)');
    }
    async down(queryRunner) {
        await queryRunner.query('DROP INDEX IDX_users_createdAt ON users');
    }
    constructor(){
        this.name = 'IndexUsersCreatedAt1781338500000';
    }
};

//# sourceMappingURL=1781338500000-IndexUsersCreatedAt.js.map