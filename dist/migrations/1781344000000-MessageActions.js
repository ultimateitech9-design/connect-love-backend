"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "MessageActions1781344000000", {
    enumerable: true,
    get: function() {
        return MessageActions1781344000000;
    }
});
let MessageActions1781344000000 = class MessageActions1781344000000 {
    async up(queryRunner) {
        await queryRunner.query('ALTER TABLE messages ADD deletedForUserIds TEXT NULL');
        await queryRunner.query('ALTER TABLE messages ADD deletedForEveryone TINYINT NOT NULL DEFAULT 0');
        await queryRunner.query('ALTER TABLE messages ADD pinnedByUserIds TEXT NULL');
        await queryRunner.query('ALTER TABLE messages ADD starredByUserIds TEXT NULL');
        await queryRunner.query('ALTER TABLE messages ADD replyToMessageId varchar(36) NULL');
        await queryRunner.query('ALTER TABLE messages ADD editedAt datetime NULL');
    }
    async down(queryRunner) {
        await queryRunner.query('ALTER TABLE messages DROP COLUMN editedAt');
        await queryRunner.query('ALTER TABLE messages DROP COLUMN replyToMessageId');
        await queryRunner.query('ALTER TABLE messages DROP COLUMN starredByUserIds');
        await queryRunner.query('ALTER TABLE messages DROP COLUMN pinnedByUserIds');
        await queryRunner.query('ALTER TABLE messages DROP COLUMN deletedForEveryone');
        await queryRunner.query('ALTER TABLE messages DROP COLUMN deletedForUserIds');
    }
    constructor(){
        this.name = 'MessageActions1781344000000';
    }
};

//# sourceMappingURL=1781344000000-MessageActions.js.map