"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "UsersController", {
    enumerable: true,
    get: function() {
        return UsersController;
    }
});
const _common = require("@nestjs/common");
const _passport = require("@nestjs/passport");
const _usersservice = require("./users.service");
const _updateprofiledto = require("./dto/update-profile.dto");
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
let UsersController = class UsersController {
    /** GET /users/me — returns the currently authenticated user's profile */ getMe(req) {
        return this.usersService.findById(req.user.userId);
    }
    /** PATCH /users/me — update the currently authenticated user's profile */ updateMe(req, dto) {
        return this.usersService.update(req.user.userId, dto);
    }
    /** DELETE /users/me — permanently delete the currently authenticated user's account and all associated data */ async deleteMe(req) {
        return this.usersService.removeMe(req.user.userId);
    }
    async getProfileDetails(id) {
        return this.usersService.findProfileDetails(id);
    }
    async getUser(id) {
        return this.usersService.findById(id);
    }
    update(id, body) {
        return this.usersService.update(id, body);
    }
    remove(id) {
        return this.usersService.remove(id);
    }
    constructor(usersService){
        this.usersService = usersService;
    }
};
_ts_decorate([
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    (0, _common.Get)('me'),
    _ts_param(0, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", void 0)
], UsersController.prototype, "getMe", null);
_ts_decorate([
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    (0, _common.Patch)('me'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        typeof _updateprofiledto.UpdateProfileDto === "undefined" ? Object : _updateprofiledto.UpdateProfileDto
    ]),
    _ts_metadata("design:returntype", void 0)
], UsersController.prototype, "updateMe", null);
_ts_decorate([
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    (0, _common.Delete)('me'),
    _ts_param(0, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object
    ]),
    _ts_metadata("design:returntype", Promise)
], UsersController.prototype, "deleteMe", null);
_ts_decorate([
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    (0, _common.Get)(':id/details'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], UsersController.prototype, "getProfileDetails", null);
_ts_decorate([
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    (0, _common.Get)(':id'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], UsersController.prototype, "getUser", null);
_ts_decorate([
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    (0, _common.Patch)(':id'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        typeof _updateprofiledto.UpdateProfileDto === "undefined" ? Object : _updateprofiledto.UpdateProfileDto
    ]),
    _ts_metadata("design:returntype", void 0)
], UsersController.prototype, "update", null);
_ts_decorate([
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    (0, _common.Delete)(':id'),
    _ts_param(0, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String
    ]),
    _ts_metadata("design:returntype", void 0)
], UsersController.prototype, "remove", null);
UsersController = _ts_decorate([
    (0, _common.Controller)('users'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _usersservice.UsersService === "undefined" ? Object : _usersservice.UsersService
    ])
], UsersController);

//# sourceMappingURL=users.controller.js.map