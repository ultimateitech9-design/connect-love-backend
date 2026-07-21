"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "VideoCallType1782180000000", {
    enumerable: true,
    get: function() {
        return VideoCallType1782180000000;
    }
});
let VideoCallType1782180000000 = class VideoCallType1782180000000 {
    async up(queryRunner) {
        await queryRunner.query("ALTER TABLE `video_calls` ADD `callType` enum ('audio', 'video') NOT NULL DEFAULT 'video'");
    }
    async down(queryRunner) {
        await queryRunner.query('ALTER TABLE `video_calls` DROP COLUMN `callType`');
    }
    constructor(){
        this.name = 'VideoCallType1782180000000';
    }
};

//# sourceMappingURL=1782180000000-VideoCallType.js.map