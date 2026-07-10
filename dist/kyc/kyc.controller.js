"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "KycController", {
    enumerable: true,
    get: function() {
        return KycController;
    }
});
const _common = require("@nestjs/common");
const _passport = require("@nestjs/passport");
const _verifykycdto = require("./dto/verify-kyc.dto");
const _kycservice = require("./kyc.service");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
function _ts_param(paramIndex, decorator) {
    return function(target, key) {
        decorator(target, key, paramIndex);
    };
}
let KycController = class KycController {
    verify(req, dto) {
        return this.kycService.verify(req.user.userId, dto.liveFrames);
    }
    constructor(kycService){
        this.kycService = kycService;
    }
};
_ts_decorate([
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    (0, _common.Post)('verify'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        typeof _verifykycdto.VerifyKycDto === "undefined" ? Object : _verifykycdto.VerifyKycDto
    ]),
    _ts_metadata("design:returntype", void 0)
], KycController.prototype, "verify", null);
KycController = _ts_decorate([
    (0, _common.Controller)('kyc'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _kycservice.KycService === "undefined" ? Object : _kycservice.KycService
    ])
], KycController);

//# sourceMappingURL=kyc.controller.js.map