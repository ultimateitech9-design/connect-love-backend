"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "FirstImpressionsController", {
    enumerable: true,
    get: function() {
        return FirstImpressionsController;
    }
});
const _common = require("@nestjs/common");
const _passport = require("@nestjs/passport");
const _firstimpressionsservice = require("./first-impressions.service");
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
let FirstImpressionsController = class FirstImpressionsController {
    send(req, receiverId, content) {
        return this.service.send(req.user.userId, receiverId, content);
    }
    received(req) {
        return this.service.received(req.user.userId);
    }
    reply(req, id, content) {
        return this.service.reply(req.user.userId, id, content);
    }
    constructor(service){
        this.service = service;
    }
};
_ts_decorate([
    (0, _common.Post)(),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)('receiverId')),
    _ts_param(2, (0, _common.Body)('content')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], FirstImpressionsController.prototype, "send", null);
_ts_decorate([
    (0, _common.Get)('received'),
    _ts_param(0, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], FirstImpressionsController.prototype, "received", null);
_ts_decorate([
    (0, _common.Post)(':id/reply'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_param(2, (0, _common.Body)('content')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], FirstImpressionsController.prototype, "reply", null);
FirstImpressionsController = _ts_decorate([
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    (0, _common.Controller)('first-impressions'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _firstimpressionsservice.FirstImpressionsService === "undefined" ? Object : _firstimpressionsservice.FirstImpressionsService
    ])
], FirstImpressionsController);

//# sourceMappingURL=first-impressions.controller.js.map