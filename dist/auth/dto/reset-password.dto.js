"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ResetPasswordDto", {
    enumerable: true,
    get: function() {
        return ResetPasswordDto;
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
let ResetPasswordDto = class ResetPasswordDto {
};
_ts_decorate([
    (0, _classvalidator.IsEmail)({}, {
        message: 'Please enter a valid email address.'
    }),
    _ts_metadata("design:type", String)
], ResetPasswordDto.prototype, "email", void 0);
_ts_decorate([
    (0, _classvalidator.Matches)(/^\d{6}$/, {
        message: 'OTP must be a 6-digit code.'
    }),
    _ts_metadata("design:type", String)
], ResetPasswordDto.prototype, "otp", void 0);
_ts_decorate([
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MinLength)(8, {
        message: 'Password must be at least 8 characters.'
    }),
    _ts_metadata("design:type", String)
], ResetPasswordDto.prototype, "newPassword", void 0);

//# sourceMappingURL=reset-password.dto.js.map