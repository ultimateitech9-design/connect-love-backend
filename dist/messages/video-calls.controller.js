"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "VideoCallsController", {
    enumerable: true,
    get: function() {
        return VideoCallsController;
    }
});
const _common = require("@nestjs/common");
const _passport = require("@nestjs/passport");
const _videocallsservice = require("./video-calls.service");
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
let VideoCallsController = class VideoCallsController {
    startCall(req, conversationId, receiverId) {
        return this.videoCallsService.start(conversationId, req.user.userId, receiverId);
    }
    acceptCall(req, id) {
        return this.videoCallsService.accept(id, req.user.userId);
    }
    endCall(req, id) {
        return this.videoCallsService.finish(id, req.user.userId, 'ended');
    }
    rejectCall(req, id) {
        return this.videoCallsService.finish(id, req.user.userId, 'rejected');
    }
    constructor(videoCallsService){
        this.videoCallsService = videoCallsService;
    }
};
_ts_decorate([
    (0, _common.Post)(),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)('conversationId')),
    _ts_param(2, (0, _common.Body)('receiverId')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        void 0,
        String,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], VideoCallsController.prototype, "startCall", null);
_ts_decorate([
    (0, _common.Patch)(':id/accept'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        void 0,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], VideoCallsController.prototype, "acceptCall", null);
_ts_decorate([
    (0, _common.Patch)(':id/end'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        void 0,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], VideoCallsController.prototype, "endCall", null);
_ts_decorate([
    (0, _common.Patch)(':id/reject'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        void 0,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], VideoCallsController.prototype, "rejectCall", null);
VideoCallsController = _ts_decorate([
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    (0, _common.Controller)('video-calls'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _videocallsservice.VideoCallsService === "undefined" ? Object : _videocallsservice.VideoCallsService
    ])
], VideoCallsController);

//# sourceMappingURL=video-calls.controller.js.map