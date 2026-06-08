"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: Object.getOwnPropertyDescriptor(all, name).get
    });
}
_export(exports, {
    get MatchRelation () {
        return MatchRelation;
    },
    get MatchStatus () {
        return MatchStatus;
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
var MatchStatus = /*#__PURE__*/ function(MatchStatus) {
    MatchStatus["PENDING"] = "PENDING";
    MatchStatus["MATCHED"] = "MATCHED";
    MatchStatus["DECLINED"] = "DECLINED";
    MatchStatus["BLOCKED"] = "BLOCKED";
    return MatchStatus;
}({});
let MatchRelation = class MatchRelation {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)('uuid'),
    _ts_metadata("design:type", String)
], MatchRelation.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.Column)(),
    _ts_metadata("design:type", String)
], MatchRelation.prototype, "senderId", void 0);
_ts_decorate([
    (0, _typeorm.Column)(),
    _ts_metadata("design:type", String)
], MatchRelation.prototype, "receiverId", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_userentity.User, {
        onDelete: 'CASCADE'
    }),
    (0, _typeorm.JoinColumn)({
        name: 'senderId'
    }),
    _ts_metadata("design:type", typeof _userentity.User === "undefined" ? Object : _userentity.User)
], MatchRelation.prototype, "sender", void 0);
_ts_decorate([
    (0, _typeorm.ManyToOne)(()=>_userentity.User, {
        onDelete: 'CASCADE'
    }),
    (0, _typeorm.JoinColumn)({
        name: 'receiverId'
    }),
    _ts_metadata("design:type", typeof _userentity.User === "undefined" ? Object : _userentity.User)
], MatchRelation.prototype, "receiver", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'enum',
        enum: MatchStatus,
        default: "PENDING"
    }),
    _ts_metadata("design:type", String)
], MatchRelation.prototype, "status", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: false
    }),
    _ts_metadata("design:type", Boolean)
], MatchRelation.prototype, "isSuperLike", void 0);
_ts_decorate([
    (0, _typeorm.CreateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], MatchRelation.prototype, "createdAt", void 0);
_ts_decorate([
    (0, _typeorm.UpdateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], MatchRelation.prototype, "updatedAt", void 0);
MatchRelation = _ts_decorate([
    (0, _typeorm.Entity)('matches')
], MatchRelation);

//# sourceMappingURL=match.entity.js.map