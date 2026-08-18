"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ProfilePhotosService", {
    enumerable: true,
    get: function() {
        return ProfilePhotosService;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _typeorm1 = require("typeorm");
const _userentity = require("../users/user.entity");
const _planentitlements = require("../plans/plan-entitlements");
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
let ProfilePhotosService = class ProfilePhotosService {
    async updatePhotos(userId, photos) {
        const user = await this.userRepository.findOne({
            where: {
                id: userId
            }
        });
        if (!user) {
            throw new _common.NotFoundException('User not found');
        }
        const uniquePhotos = [
            ...new Set((photos || []).filter(Boolean))
        ];
        if (uniquePhotos.length === 0) {
            throw new _common.BadRequestException('Keep at least one profile photo.');
        }
        const maxPhotos = (0, _planentitlements.entitlementsFor)(user).profilePhotos;
        if (uniquePhotos.length > maxPhotos) {
            throw new _common.BadRequestException(`Your plan allows a maximum of ${maxPhotos} profile photos. Upgrade to add more.`);
        }
        const primaryPhotoChanged = user.photos?.[0] !== uniquePhotos[0];
        user.photos = uniquePhotos;
        if (primaryPhotoChanged) {
            user.kycLivePhoto = null;
            user.kycMatched = false;
            user.kycMatchScore = null;
            user.kycVerifiedAt = null;
            user.isVerified = false;
        }
        await this.userRepository.save(user);
        return {
            message: 'Photos updated successfully',
            photos: user.photos,
            isVerified: user.isVerified,
            kycMatched: user.kycMatched
        };
    }
    constructor(userRepository){
        this.userRepository = userRepository;
    }
};
ProfilePhotosService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_param(0, (0, _typeorm.InjectRepository)(_userentity.User)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository
    ])
], ProfilePhotosService);

//# sourceMappingURL=profile-photos.service.js.map