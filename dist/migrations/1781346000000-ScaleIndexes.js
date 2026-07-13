"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ScaleIndexes1781346000000", {
    enumerable: true,
    get: function() {
        return ScaleIndexes1781346000000;
    }
});
let ScaleIndexes1781346000000 = class ScaleIndexes1781346000000 {
    async up(queryRunner) {
        await queryRunner.query('CREATE INDEX IDX_users_discovery ON users (status, role, birthDate, createdAt)');
        await queryRunner.query('CREATE INDEX IDX_users_city_religion ON users (city, religion)');
        await queryRunner.query('CREATE INDEX IDX_matches_sender_status ON matches (senderId, status, createdAt)');
        await queryRunner.query('CREATE INDEX IDX_matches_receiver_status ON matches (receiverId, status, createdAt)');
        await queryRunner.query('CREATE INDEX IDX_messages_conversation_created ON messages (conversationId, createdAt)');
        await queryRunner.query('CREATE INDEX IDX_messages_unread ON messages (conversationId, receiverId, isRead)');
    }
    async down(queryRunner) {
        for (const [table, index] of [
            [
                'messages',
                'IDX_messages_unread'
            ],
            [
                'messages',
                'IDX_messages_conversation_created'
            ],
            [
                'matches',
                'IDX_matches_receiver_status'
            ],
            [
                'matches',
                'IDX_matches_sender_status'
            ],
            [
                'users',
                'IDX_users_city_religion'
            ],
            [
                'users',
                'IDX_users_discovery'
            ]
        ]){
            await queryRunner.query(`DROP INDEX ${index} ON ${table}`);
        }
    }
    constructor(){
        this.name = 'ScaleIndexes1781346000000';
    }
};

//# sourceMappingURL=1781346000000-ScaleIndexes.js.map