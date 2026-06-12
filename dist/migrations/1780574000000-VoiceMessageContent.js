"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "VoiceMessageContent1780574000000", {
    enumerable: true,
    get: function() {
        return VoiceMessageContent1780574000000;
    }
});
let VoiceMessageContent1780574000000 = class VoiceMessageContent1780574000000 {
    async up(queryRunner) {
        await queryRunner.query('ALTER TABLE messages MODIFY content MEDIUMTEXT NOT NULL');
    }
    async down(queryRunner) {
        await queryRunner.query('ALTER TABLE messages MODIFY content TEXT NOT NULL');
    }
    constructor(){
        this.name = 'VoiceMessageContent1780574000000';
    }
};

//# sourceMappingURL=1780574000000-VoiceMessageContent.js.map