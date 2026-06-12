"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "VideoCalls1780572000000", {
    enumerable: true,
    get: function() {
        return VideoCalls1780572000000;
    }
});
let VideoCalls1780572000000 = class VideoCalls1780572000000 {
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS video_calls (
        id varchar(36) NOT NULL,
        conversationId varchar(36) NOT NULL,
        callerId varchar(36) NOT NULL,
        receiverId varchar(36) NOT NULL,
        status enum('ringing','active','ended','rejected','missed') NOT NULL DEFAULT 'ringing',
        startedAt timestamp NULL,
        endedAt timestamp NULL,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX IDX_video_calls_conversation (conversationId),
        INDEX IDX_video_calls_caller (callerId),
        INDEX IDX_video_calls_receiver (receiverId),
        PRIMARY KEY (id),
        CONSTRAINT FK_video_calls_conversation FOREIGN KEY (conversationId) REFERENCES matches(id) ON DELETE CASCADE,
        CONSTRAINT FK_video_calls_caller FOREIGN KEY (callerId) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT FK_video_calls_receiver FOREIGN KEY (receiverId) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    }
    async down(queryRunner) {
        await queryRunner.query('DROP TABLE IF EXISTS video_calls');
    }
    constructor(){
        this.name = 'VideoCalls1780572000000';
    }
};

//# sourceMappingURL=1780572000000-VideoCalls.js.map