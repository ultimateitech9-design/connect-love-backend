"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AuditLog", {
    enumerable: true,
    get: function() {
        return AuditLog;
    }
});
const _typeorm = require("typeorm");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let AuditLog = class AuditLog {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)('uuid'),
    _ts_metadata("design:type", String)
], AuditLog.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        nullable: true
    }),
    _ts_metadata("design:type", String)
], AuditLog.prototype, "userId", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        length: 150
    }),
    _ts_metadata("design:type", String)
], AuditLog.prototype, "user", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        length: 255
    }),
    _ts_metadata("design:type", String)
], AuditLog.prototype, "activity", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        length: 80,
        default: '127.0.0.1'
    }),
    _ts_metadata("design:type", String)
], AuditLog.prototype, "ipAddress", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        length: 80
    }),
    _ts_metadata("design:type", String)
], AuditLog.prototype, "action", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        length: 80
    }),
    _ts_metadata("design:type", String)
], AuditLog.prototype, "module", void 0);
_ts_decorate([
    (0, _typeorm.CreateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], AuditLog.prototype, "createdAt", void 0);
AuditLog = _ts_decorate([
    (0, _typeorm.Entity)('audit_logs')
], AuditLog);

//# sourceMappingURL=audit-log.entity.js.map