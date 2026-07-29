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
const _createnewslettersubscriptiondto = require("./dto/create-newsletter-subscription.dto");
const _rolesguard = require("../auth/roles.guard");
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
    subscribeNewsletter(dto) {
        return this.supportService.subscribeNewsletter(dto.email);
    }
    // Admin only — list all contact submissions
    findAll() {
        return this.supportService.findAll();
    }
    overview() {
        return this.supportService.overview();
    }
    tickets(status) {
        return this.supportService.findTickets(status);
    }
    updateTicket(id, status) {
        return this.supportService.updateStatus(Number(id), status);
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
    (0, _common.Post)('newsletter'),
    _ts_param(0, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _createnewslettersubscriptiondto.CreateNewsletterSubscriptionDto === "undefined" ? Object : _createnewslettersubscriptiondto.CreateNewsletterSubscriptionDto
    ]),
    _ts_metadata("design:returntype", void 0)
], SupportController.prototype, "subscribeNewsletter", null);
_ts_decorate([
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt'), _rolesguard.RolesGuard),
    (0, _rolesguard.Roles)('support', 'admin', 'super_admin'),
    (0, _common.Get)('contacts'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", void 0)
], SupportController.prototype, "findAll", null);
_ts_decorate([
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt'), _rolesguard.RolesGuard),
    (0, _rolesguard.Roles)('support', 'admin', 'super_admin'),
    (0, _common.Get)('overview'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", void 0)
], SupportController.prototype, "overview", null);
_ts_decorate([
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt'), _rolesguard.RolesGuard),
    (0, _rolesguard.Roles)('support', 'admin', 'super_admin'),
    (0, _common.Get)('tickets'),
    _ts_param(0, (0, _common.Query)('status')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], SupportController.prototype, "tickets", null);
_ts_decorate([
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt'), _rolesguard.RolesGuard),
    (0, _rolesguard.Roles)('support', 'admin', 'super_admin'),
    (0, _common.Patch)('tickets/:id/status'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Body)('status')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], SupportController.prototype, "updateTicket", null);
SupportController = _ts_decorate([
    (0, _common.Controller)('support'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _supportservice.SupportService === "undefined" ? Object : _supportservice.SupportService
    ])
], SupportController);

//# sourceMappingURL=support.controller.js.map