"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AdminController", {
    enumerable: true,
    get: function() {
        return AdminController;
    }
});
const _common = require("@nestjs/common");
const _passport = require("@nestjs/passport");
const _adminservice = require("./admin.service");
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
let AdminController = class AdminController {
    getStats() {
        return this.adminService.getStats();
    }
    getUsers(page = '1', limit = '20') {
        return this.adminService.getAllUsers(+page, +limit);
    }
    updateStatus(id, status) {
        return this.adminService.updateUserStatus(id, status);
    }
    getContacts() {
        return this.adminService.getAllContacts();
    }
    getPayments() {
        return this.adminService.getPayments();
    }
    getVerificationQueue() {
        return this.adminService.getVerificationQueue();
    }
    getSubscriptions() {
        return this.adminService.getSubscriptions();
    }
    getAnalytics() {
        return this.adminService.getAnalytics();
    }
    constructor(adminService){
        this.adminService = adminService;
    }
};
_ts_decorate([
    (0, _common.Get)('stats'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", void 0)
], AdminController.prototype, "getStats", null);
_ts_decorate([
    (0, _common.Get)('users'),
    _ts_param(0, (0, _common.Query)('page')),
    _ts_param(1, (0, _common.Query)('limit')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        void 0,
        void 0
    ]),
    _ts_metadata("design:returntype", void 0)
], AdminController.prototype, "getUsers", null);
_ts_decorate([
    (0, _common.Patch)('users/:id/status'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Body)('status')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], AdminController.prototype, "updateStatus", null);
_ts_decorate([
    (0, _common.Get)('contacts'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", void 0)
], AdminController.prototype, "getContacts", null);
_ts_decorate([
    (0, _common.Get)('payments'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", void 0)
], AdminController.prototype, "getPayments", null);
_ts_decorate([
    (0, _common.Get)('verification'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", void 0)
], AdminController.prototype, "getVerificationQueue", null);
_ts_decorate([
    (0, _common.Get)('subscriptions'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", void 0)
], AdminController.prototype, "getSubscriptions", null);
_ts_decorate([
    (0, _common.Get)('analytics'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", void 0)
], AdminController.prototype, "getAnalytics", null);
AdminController = _ts_decorate([
    (0, _common.Controller)('admin'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _adminservice.AdminService === "undefined" ? Object : _adminservice.AdminService
    ])
], AdminController);

//# sourceMappingURL=admin.controller.js.map