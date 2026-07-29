"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ChatbotController", {
    enumerable: true,
    get: function() {
        return ChatbotController;
    }
});
const _common = require("@nestjs/common");
const _classvalidator = require("class-validator");
const _chatbotservice = require("./chatbot.service");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
function _ts_param(paramIndex, decorator) {
    return function(target, key) {
        decorator(target, key, paramIndex);
    };
}
let ChatbotMessageDto = class ChatbotMessageDto {
};
_ts_decorate([
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MinLength)(1),
    (0, _classvalidator.MaxLength)(500),
    _ts_metadata("design:type", String)
], ChatbotMessageDto.prototype, "message", void 0);
_ts_decorate([
    (0, _classvalidator.IsIn)([
        'en',
        'hi'
    ]),
    _ts_metadata("design:type", typeof _chatbotservice.ChatbotLanguage === "undefined" ? Object : _chatbotservice.ChatbotLanguage)
], ChatbotMessageDto.prototype, "language", void 0);
let ChatbotController = class ChatbotController {
    message(body) {
        return {
            reply: this.chatbotService.reply(body.message, body.language),
            supportSuggested: this.chatbotService.shouldSuggestSupport(body.message)
        };
    }
    constructor(chatbotService){
        this.chatbotService = chatbotService;
    }
};
_ts_decorate([
    (0, _common.Post)('message'),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof ChatbotMessageDto === "undefined" ? Object : ChatbotMessageDto
    ]),
    _ts_metadata("design:returntype", void 0)
], ChatbotController.prototype, "message", null);
ChatbotController = _ts_decorate([
    (0, _common.Controller)('chatbot'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _chatbotservice.ChatbotService === "undefined" ? Object : _chatbotservice.ChatbotService
    ])
], ChatbotController);

//# sourceMappingURL=chatbot.controller.js.map