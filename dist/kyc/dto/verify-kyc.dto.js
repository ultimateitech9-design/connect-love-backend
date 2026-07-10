"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "VerifyKycDto", {
    enumerable: true,
    get: function() {
        return VerifyKycDto;
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
let VerifyKycDto = class VerifyKycDto {
};
_ts_decorate([
    (0, _classvalidator.IsArray)(),
    (0, _classvalidator.ArrayMinSize)(3, {
        message: 'Capture at least 3 live camera frames.'
    }),
    (0, _classvalidator.ArrayMaxSize)(5, {
        message: 'Maximum 5 live camera frames allowed.'
    }),
    (0, _classvalidator.IsString)({
        each: true
    }),
    _ts_metadata("design:type", Array)
], VerifyKycDto.prototype, "liveFrames", void 0);

//# sourceMappingURL=verify-kyc.dto.js.map