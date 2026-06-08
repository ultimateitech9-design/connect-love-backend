"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "SupportController", {
    enumerable: true,
    get: function() {
        return SupportController;
    }
});
const _common = require("@nestjs/common");
const _passport = require("@nestjs/passport");
const _supportservice = require("./support.service");
const _createcontactdto = require("./dto/create-contact.dto");
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
let SupportController = class SupportController {
    // Public endpoint — anyone can submit a contact form
    createContact(dto) {
        return this.supportService.createContact(dto);
    }
    // Admin only — list all contact submissions
    findAll() {
        return this.supportService.findAll();
    }
    constructor(supportService){
        this.supportService = supportService;
    }
};
_ts_decorate([
    (0, _common.Post)('contact'),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _createcontactdto.CreateContactDto === "undefined" ? Object : _createcontactdto.CreateContactDto
    ]),
    _ts_metadata("design:returntype", void 0)
], SupportController.prototype, "createContact", null);
_ts_decorate([
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    (0, _common.Get)('contacts'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", void 0)
], SupportController.prototype, "findAll", null);
SupportController = _ts_decorate([
    (0, _common.Controller)('support'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _supportservice.SupportService === "undefined" ? Object : _supportservice.SupportService
    ])
], SupportController);

//# sourceMappingURL=support.controller.js.map