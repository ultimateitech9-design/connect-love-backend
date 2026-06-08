"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ProfilePhotosController", {
    enumerable: true,
    get: function() {
        return ProfilePhotosController;
    }
});
const _common = require("@nestjs/common");
const _passport = require("@nestjs/passport");
const _profilephotosservice = require("./profile-photos.service");
const _updatephotosdto = require("./update-photos.dto");
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
let ProfilePhotosController = class ProfilePhotosController {
    async updatePhotos(req, updatePhotosDto) {
        return this.profilePhotosService.updatePhotos(req.user.userId, updatePhotosDto.photos || []);
    }
    constructor(profilePhotosService){
        this.profilePhotosService = profilePhotosService;
    }
};
_ts_decorate([
    (0, _common.Patch)('photos'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        Object,
        typeof _updatephotosdto.UpdatePhotosDto === "undefined" ? Object : _updatephotosdto.UpdatePhotosDto
    ]),
    _ts_metadata("design:returntype", Promise)
], ProfilePhotosController.prototype, "updatePhotos", null);
ProfilePhotosController = _ts_decorate([
    (0, _common.Controller)('user/profile'),
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _profilephotosservice.ProfilePhotosService === "undefined" ? Object : _profilephotosservice.ProfilePhotosService
    ])
], ProfilePhotosController);

//# sourceMappingURL=profile-photos.controller.js.map