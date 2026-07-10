"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "KycService", {
    enumerable: true,
    get: function() {
        return KycService;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _typeorm1 = require("typeorm");
const _userentity = require("../users/user.entity");
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
const MATCH_THRESHOLD = 60;
let KycService = class KycService {
    async verify(userId, liveFrames) {
        const user = await this.userRepo.findOne({
            where: {
                id: userId
            }
        });
        if (!user) throw new _common.NotFoundException('User not found.');
        if (!user.photos?.length) {
            throw new _common.BadRequestException('Upload at least one profile photo before video KYC.');
        }
        const serviceUrl = process.env.FACE_SERVICE_URL || 'http://127.0.0.1:8001';
        const secret = process.env.FACE_SERVICE_SECRET || '';
        if (!secret) {
            throw new _common.ServiceUnavailableException('Face verification service is not configured.');
        }
        const controller = new AbortController();
        const timeout = setTimeout(()=>controller.abort(), 45_000);
        let response;
        try {
            response = await fetch(`${serviceUrl.replace(/\/$/, '')}/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Internal-Secret': secret
                },
                body: JSON.stringify({
                    reference_images: user.photos,
                    live_frames: liveFrames
                }),
                signal: controller.signal
            });
        } catch  {
            throw new _common.ServiceUnavailableException('Face verification service is unavailable.');
        } finally{
            clearTimeout(timeout);
        }
        const result = await response.json().catch(()=>null);
        if (!response.ok) {
            const detail = result && 'detail' in result ? result.detail : null;
            throw new _common.BadGatewayException(detail || 'Face verification could not be completed.');
        }
        const verified = result;
        const matched = Boolean(verified.matched && verified.motionDetected && Number(verified.score) >= MATCH_THRESHOLD);
        await this.userRepo.update(userId, {
            kycLivePhoto: liveFrames[0],
            kycMatched: matched,
            kycMatchScore: Math.max(0, Math.min(100, Math.round(Number(verified.score) || 0))),
            kycVerifiedAt: matched ? new Date() : null,
            isVerified: matched
        });
        return {
            matched,
            score: Math.round(Number(verified.score) || 0),
            requiredScore: MATCH_THRESHOLD,
            passingFrames: verified.passingFrames,
            requiredFrames: verified.requiredFrames,
            referenceFaces: verified.referenceFaces,
            motionDetected: verified.motionDetected,
            kycLivePhoto: liveFrames[0]
        };
    }
    constructor(userRepo){
        this.userRepo = userRepo;
    }
};
KycService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_param(0, (0, _typeorm.InjectRepository)(_userentity.User)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository
    ])
], KycService);

//# sourceMappingURL=kyc.service.js.map