"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "DiscoveryController", {
    enumerable: true,
    get: function() {
        return DiscoveryController;
    }
});
const _common = require("@nestjs/common");
const _passport = require("@nestjs/passport");
const _discoveryservice = require("./discovery.service");
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
let DiscoveryController = class DiscoveryController {
    async getSuggestions(req, search, ageMin, ageMax, interestedIn, goals, page, limit) {
        return this.discoveryService.getSuggestions(req.user.userId, {
            search,
            ageMin: ageMin ? Number(ageMin) : undefined,
            ageMax: ageMax ? Number(ageMax) : undefined,
            interestedIn,
            goals: goals ? goals.split(',').map((goal)=>goal.trim()).filter(Boolean) : undefined,
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined
        });
    }
    async getTags() {
        return this.discoveryService.getPopularTags();
    }
    constructor(discoveryService){
        this.discoveryService = discoveryService;
    }
};
_ts_decorate([
    (0, _common.Get)(),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Query)('search')),
    _ts_param(2, (0, _common.Query)('ageMin')),
    _ts_param(3, (0, _common.Query)('ageMax')),
    _ts_param(4, (0, _common.Query)('interestedIn')),
    _ts_param(5, (0, _common.Query)('goals')),
    _ts_param(6, (0, _common.Query)('page')),
    _ts_param(7, (0, _common.Query)('limit')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        String,
        String,
        String,
        String,
        String,
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], DiscoveryController.prototype, "getSuggestions", null);
_ts_decorate([
    (0, _common.Get)('tags'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], DiscoveryController.prototype, "getTags", null);
DiscoveryController = _ts_decorate([
    (0, _common.Controller)('discovery'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _discoveryservice.DiscoveryService === "undefined" ? Object : _discoveryservice.DiscoveryService
    ])
], DiscoveryController);

//# sourceMappingURL=discovery.controller.js.map