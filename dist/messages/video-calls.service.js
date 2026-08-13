"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "VideoCallsService", {
    enumerable: true,
    get: function() {
        return VideoCallsService;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _typeorm1 = require("typeorm");
const _matchentity = require("../matches/match.entity");
const _videocallentity = require("./video-call.entity");
const _planusageservice = require("../plans/plan-usage.service");
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
let VideoCallsService = class VideoCallsService {
    async assertMatchedConversation(conversationId, userId) {
        const match = await this.matchRepo.findOne({
            where: {
                id: conversationId
            }
        });
        if (!match) throw new _common.NotFoundException('Conversation not found.');
        if (match.senderId !== userId && match.receiverId !== userId) {
            throw new _common.ForbiddenException('You are not part of this conversation.');
        }
        if (match.status !== _matchentity.MatchStatus.MATCHED) {
            throw new _common.ForbiddenException('Video calls are available only after both users match.');
        }
        return match;
    }
    async start(conversationId, callerId, receiverId, callType = 'video') {
        const match = await this.assertMatchedConversation(conversationId, callerId);
        const validReceiver = receiverId === match.senderId || receiverId === match.receiverId;
        if (!validReceiver || receiverId === callerId) {
            throw new _common.ForbiddenException('Invalid receiver for this call.');
        }
        if (callType === 'video') await this.planUsage.assertAndRecord(callerId, 'videoCallsPerMonth', 'Video call', receiverId);
        return this.callRepo.save(this.callRepo.create({
            conversationId,
            callerId,
            receiverId,
            callType,
            status: 'ringing'
        }));
    }
    async findIncoming(userId) {
        const recentThreshold = new Date(Date.now() - 2 * 60 * 1000);
        return this.callRepo.findOne({
            where: {
                receiverId: userId,
                status: 'ringing',
                createdAt: (0, _typeorm1.MoreThan)(recentThreshold)
            },
            order: {
                createdAt: 'DESC'
            }
        });
    }
    async accept(callId, userId) {
        const call = await this.callRepo.findOne({
            where: {
                id: callId
            }
        });
        if (!call) throw new _common.NotFoundException('Call not found.');
        if (call.receiverId !== userId) throw new _common.ForbiddenException('Only the receiver can accept this call.');
        call.status = 'active';
        call.startedAt = new Date();
        return this.callRepo.save(call);
    }
    async durationMinutesForCaller(callerId) {
        const { limits } = await this.planUsage.get(callerId);
        return limits.maxVideoCallMinutes;
    }
    async finish(callId, userId, status = 'ended') {
        const call = await this.callRepo.findOne({
            where: {
                id: callId
            }
        });
        if (!call) throw new _common.NotFoundException('Call not found.');
        if (call.callerId !== userId && call.receiverId !== userId) {
            throw new _common.ForbiddenException('You are not part of this call.');
        }
        call.status = status;
        call.endedAt = new Date();
        return this.callRepo.save(call);
    }
    constructor(callRepo, matchRepo, planUsage){
        this.callRepo = callRepo;
        this.matchRepo = matchRepo;
        this.planUsage = planUsage;
    }
};
VideoCallsService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_param(0, (0, _typeorm.InjectRepository)(_videocallentity.VideoCall)),
    _ts_param(1, (0, _typeorm.InjectRepository)(_matchentity.MatchRelation)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _planusageservice.PlanUsageService === "undefined" ? Object : _planusageservice.PlanUsageService
    ])
], VideoCallsService);

//# sourceMappingURL=video-calls.service.js.map