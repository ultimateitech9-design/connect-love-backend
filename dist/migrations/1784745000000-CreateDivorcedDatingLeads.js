"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "CreateDivorcedDatingLeads1784745000000", {
    enumerable: true,
    get: function() {
        return CreateDivorcedDatingLeads1784745000000;
    }
});
let CreateDivorcedDatingLeads1784745000000 = class CreateDivorcedDatingLeads1784745000000 {
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE divorced_dating_leads (
        id int NOT NULL AUTO_INCREMENT,
        relationshipGoal varchar(40) NOT NULL,
        ageRange varchar(20) NOT NULL,
        city varchar(120) NOT NULL,
        childrenPreference varchar(40) NOT NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    }
    async down(queryRunner) {
        await queryRunner.query('DROP TABLE IF EXISTS divorced_dating_leads');
    }
    constructor(){
        this.name = 'CreateDivorcedDatingLeads1784745000000';
    }
};

//# sourceMappingURL=1784745000000-CreateDivorcedDatingLeads.js.map