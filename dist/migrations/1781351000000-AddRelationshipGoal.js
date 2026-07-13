"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AddRelationshipGoal1781351000000", {
    enumerable: true,
    get: function() {
        return AddRelationshipGoal1781351000000;
    }
});
let AddRelationshipGoal1781351000000 = class AddRelationshipGoal1781351000000 {
    async up(queryRunner) {
        await queryRunner.query('ALTER TABLE users ADD relationshipGoal varchar(30) NULL');
        await queryRunner.query('CREATE INDEX IDX_users_relationship_goal ON users (relationshipGoal)');
    }
    async down(queryRunner) {
        await queryRunner.query('DROP INDEX IDX_users_relationship_goal ON users');
        await queryRunner.query('ALTER TABLE users DROP COLUMN relationshipGoal');
    }
    constructor(){
        this.name = 'AddRelationshipGoal1781351000000';
    }
};

//# sourceMappingURL=1781351000000-AddRelationshipGoal.js.map