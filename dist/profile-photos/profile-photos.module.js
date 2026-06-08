"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ProfilePhotosModule", {
    enumerable: true,
    get: function() {
        return ProfilePhotosModule;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _userentity = require("../users/user.entity");
const _profilephotoscontroller = require("./profile-photos.controller");
const _profilephotosservice = require("./profile-photos.service");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let ProfilePhotosModule = class ProfilePhotosModule {
};
ProfilePhotosModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _typeorm.TypeOrmModule.forFeature([
                _userentity.User
            ])
        ],
        controllers: [
            _profilephotoscontroller.ProfilePhotosController
        ],
        providers: [
            _profilephotosservice.ProfilePhotosService
        ]
    })
], ProfilePhotosModule);

//# sourceMappingURL=profile-photos.module.js.map