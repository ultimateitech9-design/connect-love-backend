"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "VerifyRegistrationDto", {
    enumerable: true,
    get: function() {
        return VerifyRegistrationDto;
    }
});
const _classvalidator = require("class-validator");
const _registerdto = require("./register.dto");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let VerifyRegistrationDto = class VerifyRegistrationDto extends _registerdto.RegisterDto {
};
_ts_decorate([
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.Matches)(/^\d{6}$/, {
        message: 'OTP must be a 6-digit code.'
    }),
    _ts_metadata("design:type", String)
], VerifyRegistrationDto.prototype, "otp", void 0);

//# sourceMappingURL=verify-registration.dto.js.map