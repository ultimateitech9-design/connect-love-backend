"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "DivorcedController", {
    enumerable: true,
    get: function() {
        return DivorcedController;
    }
});
const _common = require("@nestjs/common");
const _divorceddto = require("./divorced.dto");
const _divorcedservice = require("./divorced.service");
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
let DivorcedController = class DivorcedController {
    createLead(body) {
        return this.divorcedService.createLead(body);
    }
    constructor(divorcedService){
        this.divorcedService = divorcedService;
    }
};
_ts_decorate([
    (0, _common.Post)('lead'),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _divorceddto.CreateDivorcedLeadDto === "undefined" ? Object : _divorceddto.CreateDivorcedLeadDto
    ]),
    _ts_metadata("design:returntype", void 0)
], DivorcedController.prototype, "createLead", null);
DivorcedController = _ts_decorate([
    (0, _common.Controller)('divorced'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _divorcedservice.DivorcedService === "undefined" ? Object : _divorcedservice.DivorcedService
    ])
], DivorcedController);

//# sourceMappingURL=divorced.controller.js.map