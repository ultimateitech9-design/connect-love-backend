"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "DivorcedLead", {
    enumerable: true,
    get: function() {
        return DivorcedLead;
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
let DivorcedLead = class DivorcedLead {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)(),
    _ts_metadata("design:type", Number)
], DivorcedLead.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        length: 40
    }),
    _ts_metadata("design:type", String)
], DivorcedLead.prototype, "relationshipGoal", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        length: 20
    }),
    _ts_metadata("design:type", String)
], DivorcedLead.prototype, "ageRange", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        length: 120
    }),
    _ts_metadata("design:type", String)
], DivorcedLead.prototype, "city", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        length: 40
    }),
    _ts_metadata("design:type", String)
], DivorcedLead.prototype, "childrenPreference", void 0);
_ts_decorate([
    (0, _typeorm.CreateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], DivorcedLead.prototype, "createdAt", void 0);
DivorcedLead = _ts_decorate([
    (0, _typeorm.Entity)('divorced_dating_leads')
], DivorcedLead);

//# sourceMappingURL=divorced-lead.entity.js.map