"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "UpdatePhotosDto", {
    enumerable: true,
    get: function() {
        return UpdatePhotosDto;
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
let UpdatePhotosDto = class UpdatePhotosDto {
};
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsArray)(),
    (0, _classvalidator.ArrayMaxSize)(5, {
        message: 'Maximum 5 photos allowed'
    }),
    (0, _classvalidator.IsString)({
        each: true,
        message: 'Each photo must be a valid string'
    }),
    _ts_metadata("design:type", Array)
], UpdatePhotosDto.prototype, "photos", void 0);

//# sourceMappingURL=update-photos.dto.js.map