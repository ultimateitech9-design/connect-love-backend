"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "CreateDivorcedLeadDto", {
    enumerable: true,
    get: function() {
        return CreateDivorcedLeadDto;
    }
});
const _classvalidator = require("class-validator");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let CreateDivorcedLeadDto = class CreateDivorcedLeadDto {
};
_ts_decorate([
    (0, _classvalidator.IsIn)([
        'second-marriage',
        'serious-relationship',
        'companionship',
        'friendship-first'
    ]),
    _ts_metadata("design:type", String)
], CreateDivorcedLeadDto.prototype, "relationshipGoal", void 0);
_ts_decorate([
    (0, _classvalidator.IsIn)([
        '30-39',
        '40-49',
        '50-59',
        '60+'
    ]),
    _ts_metadata("design:type", String)
], CreateDivorcedLeadDto.prototype, "ageRange", void 0);
_ts_decorate([
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MinLength)(2),
    (0, _classvalidator.MaxLength)(120),
    _ts_metadata("design:type", String)
], CreateDivorcedLeadDto.prototype, "city", void 0);
_ts_decorate([
    (0, _classvalidator.IsIn)([
        'yes',
        'no',
        'open-to-discuss'
    ]),
    _ts_metadata("design:type", String)
], CreateDivorcedLeadDto.prototype, "childrenPreference", void 0);

//# sourceMappingURL=divorced.dto.js.map