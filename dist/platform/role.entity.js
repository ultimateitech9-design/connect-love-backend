"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "PlatformRole", {
    enumerable: true,
    get: function() {
        return PlatformRole;
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
let PlatformRole = class PlatformRole {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)('uuid'),
    _ts_metadata("design:type", String)
], PlatformRole.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        unique: true,
        length: 120
    }),
    _ts_metadata("design:type", String)
], PlatformRole.prototype, "role", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: 0
    }),
    _ts_metadata("design:type", Number)
], PlatformRole.prototype, "permissions", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        length: 30,
        default: 'Active'
    }),
    _ts_metadata("design:type", String)
], PlatformRole.prototype, "status", void 0);
PlatformRole = _ts_decorate([
    (0, _typeorm.Entity)('platform_roles')
], PlatformRole);

//# sourceMappingURL=role.entity.js.map