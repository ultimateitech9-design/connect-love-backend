"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "Message", {
    enumerable: true,
    get: function() {
        return Message;
    }
});
const _typeorm = require("typeorm");
const _userentity = require("../users/user.entity");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let Message = class Message {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)('uuid'),
    _ts_metadata("design:type", String)
], Message.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.Column)(),
    _ts_metadata("design:type", String)
], Message.prototype, "conversationId", void 0);
_ts_decorate([
    (0, _typeorm.Column)(),
    _ts_metadata("design:type", String)
], Message.prototype, "senderId", void 0);
_ts_decorate([
    (0, _typeorm.Column)(),
    _ts_metadata("design:type", String)
], Message.prototype, "receiverId", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_userentity.User, {
        onDelete: 'CASCADE'
    }),
    (0, _typeorm.JoinColumn)({
        name: 'senderId'
    }),
    _ts_metadata("design:type", typeof _userentity.User === "undefined" ? Object : _userentity.User)
], Message.prototype, "sender", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_userentity.User, {
        onDelete: 'CASCADE'
    }),
    (0, _typeorm.JoinColumn)({
        name: 'receiverId'
    }),
    _ts_metadata("design:type", typeof _userentity.User === "undefined" ? Object : _userentity.User)
], Message.prototype, "receiver", void 0);
_ts_decorate([
    (0, _typeorm.Column)('mediumtext'),
    _ts_metadata("design:type", String)
], Message.prototype, "content", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'text',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], Message.prototype, "reactions", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'text',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], Message.prototype, "deletedForUserIds", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: false
    }),
    _ts_metadata("design:type", Boolean)
], Message.prototype, "deletedForEveryone", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'text',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], Message.prototype, "pinnedByUserIds", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'text',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], Message.prototype, "starredByUserIds", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'varchar',
        length: 36,
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], Message.prototype, "replyToMessageId", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: false
    }),
    _ts_metadata("design:type", Boolean)
], Message.prototype, "isRead", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'datetime',
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], Message.prototype, "editedAt", void 0);
_ts_decorate([
    (0, _typeorm.CreateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], Message.prototype, "createdAt", void 0);
Message = _ts_decorate([
    (0, _typeorm.Entity)('messages')
], Message);

//# sourceMappingURL=message.entity.js.map