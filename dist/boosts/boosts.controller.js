"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "BoostsController", {
    enumerable: true,
    get: function() {
        return BoostsController;
    }
});
const _common = require("@nestjs/common");
const _passport = require("@nestjs/passport");
const _activateboostdto = require("./dto/activate-boost.dto");
const _boostsservice = require("./boosts.service");
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
let BoostsController = class BoostsController {
    plans() {
        return this.boosts.getPlans();
    }
    status(req) {
        return this.boosts.getStatus(req.user.userId);
    }
    activate(req, dto) {
        return this.boosts.activate(req.user.userId, dto.planKey, dto.requestId);
    }
    constructor(boosts){
        this.boosts = boosts;
    }
};
_ts_decorate([
    (0, _common.Get)('plans'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", void 0)
], BoostsController.prototype, "plans", null);
_ts_decorate([
    (0, _common.Get)('status'),
    _ts_param(0, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], BoostsController.prototype, "status", null);
_ts_decorate([
    (0, _common.Post)('activate'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        typeof _activateboostdto.ActivateBoostDto === "undefined" ? Object : _activateboostdto.ActivateBoostDto
    ]),
    _ts_metadata("design:returntype", void 0)
], BoostsController.prototype, "activate", null);
BoostsController = _ts_decorate([
    (0, _common.Controller)('boosts'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _boostsservice.BoostsService === "undefined" ? Object : _boostsservice.BoostsService
    ])
], BoostsController);

//# sourceMappingURL=boosts.controller.js.map