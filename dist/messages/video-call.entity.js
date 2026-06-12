"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "VideoCall", {
    enumerable: true,
    get: function() {
        return VideoCall;
    }
});
const _typeorm = require("typeorm");
const _userentity = require("../users/user.entity");
const _matchentity = require("../matches/match.entity");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let VideoCall = class VideoCall {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)('uuid'),
    _ts_metadata("design:type", String)
], VideoCall.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.Column)(),
    _ts_metadata("design:type", String)
], VideoCall.prototype, "conversationId", void 0);
_ts_decorate([
    (0, _typeorm.Column)(),
    _ts_metadata("design:type", String)
], VideoCall.prototype, "callerId", void 0);
_ts_decorate([
    (0, _typeorm.Column)(),
    _ts_metadata("design:type", String)
], VideoCall.prototype, "receiverId", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_matchentity.MatchRelation, {
        onDelete: 'CASCADE'
    }),
    (0, _typeorm.JoinColumn)({
        name: 'conversationId'
    }),
    _ts_metadata("design:type", typeof _matchentity.MatchRelation === "undefined" ? Object : _matchentity.MatchRelation)
], VideoCall.prototype, "conversation", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_userentity.User, {
        onDelete: 'CASCADE'
    }),
    (0, _typeorm.JoinColumn)({
        name: 'callerId'
    }),
    _ts_metadata("design:type", typeof _userentity.User === "undefined" ? Object : _userentity.User)
], VideoCall.prototype, "caller", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_userentity.User, {
        onDelete: 'CASCADE'
    }),
    (0, _typeorm.JoinColumn)({
        name: 'receiverId'
    }),
    _ts_metadata("design:type", typeof _userentity.User === "undefined" ? Object : _userentity.User)
], VideoCall.prototype, "receiver", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'enum',
        enum: [
            'ringing',
            'active',
            'ended',
            'rejected',
            'missed'
        ],
        default: 'ringing'
    }),
    _ts_metadata("design:type", typeof VideoCallStatus === "undefined" ? Object : VideoCallStatus)
], VideoCall.prototype, "status", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true,
        type: 'timestamp'
    }),
    _ts_metadata("design:type", Object)
], VideoCall.prototype, "startedAt", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true,
        type: 'timestamp'
    }),
    _ts_metadata("design:type", Object)
], VideoCall.prototype, "endedAt", void 0);
_ts_decorate([
    (0, _typeorm.CreateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], VideoCall.prototype, "createdAt", void 0);
_ts_decorate([
    (0, _typeorm.UpdateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], VideoCall.prototype, "updatedAt", void 0);
VideoCall = _ts_decorate([
    (0, _typeorm.Entity)('video_calls')
], VideoCall);

//# sourceMappingURL=video-call.entity.js.map