"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "UniqueFirstImpressionPair1786072000000", {
    enumerable: true,
    get: function() {
        return UniqueFirstImpressionPair1786072000000;
    }
});
let UniqueFirstImpressionPair1786072000000 = class UniqueFirstImpressionPair1786072000000 {
    async up(queryRunner) {
        await queryRunner.query(`DELETE duplicate FROM first_impressions duplicate
      INNER JOIN first_impressions original
        ON duplicate.senderId = original.senderId
        AND duplicate.receiverId = original.receiverId
        AND (duplicate.createdAt > original.createdAt OR (duplicate.createdAt = original.createdAt AND duplicate.id > original.id))`);
        await queryRunner.query('CREATE UNIQUE INDEX UQ_first_impressions_sender_receiver ON first_impressions (senderId, receiverId)');
    }
    async down(queryRunner) {
        await queryRunner.query('DROP INDEX UQ_first_impressions_sender_receiver ON first_impressions');
    }
    constructor(){
        this.name = 'UniqueFirstImpressionPair1786072000000';
    }
};

//# sourceMappingURL=1786072000000-UniqueFirstImpressionPair.js.map