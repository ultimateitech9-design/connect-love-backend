"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: Object.getOwnPropertyDescriptor(all, name).get
    });
}
_export(exports, {
    get BOOST_PLANS () {
        return BOOST_PLANS;
    },
    get BoostsService () {
        return BoostsService;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _typeorm1 = require("typeorm");
const _boostentity = require("./boost.entity");
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
const BOOST_PLANS = {
    '30_minutes': {
        name: '30 Minutes Boost',
        durationMinutes: 30,
        price: 49
    },
    '1_hour': {
        name: '1 Hour Boost',
        durationMinutes: 60,
        price: 99
    },
    '3_hours': {
        name: '3 Hours Boost',
        durationMinutes: 180,
        price: 199
    },
    '24_hours': {
        name: '24 Hours Boost',
        durationMinutes: 1440,
        price: 499
    }
};
let BoostsService = class BoostsService {
    getPlans() {
        return Object.entries(BOOST_PLANS).map(([key, plan])=>({
                key,
                ...plan,
                currency: 'INR'
            }));
    }
    async getStatus(userId) {
        const active = await this.boosts.findOne({
            where: {
                userId,
                endsAt: (0, _typeorm1.MoreThan)(new Date())
            },
            order: {
                endsAt: 'DESC'
            }
        });
        return {
            active: Boolean(active),
            boost: active ?? null,
            serverTime: new Date().toISOString()
        };
    }
    async activate(userId, planKey, requestId) {
        const plan = BOOST_PLANS[planKey];
        return this.boosts.manager.transaction(async (manager)=>{
            const repo = manager.getRepository(_boostentity.ProfileBoost);
            // Serialize purchases per user so simultaneous requests stack instead of overlapping.
            await manager.getRepository(_userentity.User).findOne({
                where: {
                    id: userId
                },
                lock: {
                    mode: 'pessimistic_write'
                }
            });
            const duplicate = await repo.findOne({
                where: {
                    userId,
                    requestId
                }
            });
            if (duplicate) return duplicate;
            const latest = await repo.findOne({
                where: {
                    userId
                },
                order: {
                    endsAt: 'DESC'
                }
            });
            const now = new Date();
            const startsAt = latest?.endsAt && latest.endsAt > now ? latest.endsAt : now;
            const endsAt = new Date(startsAt.getTime() + plan.durationMinutes * 60_000);
            return repo.save(repo.create({
                userId,
                requestId,
                planKey,
                amount: plan.price,
                currency: 'INR',
                startsAt,
                endsAt
            }));
        });
    }
    constructor(boosts){
        this.boosts = boosts;
    }
};
BoostsService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_param(0, (0, _typeorm.InjectRepository)(_boostentity.ProfileBoost)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository
    ])
], BoostsService);

//# sourceMappingURL=boosts.service.js.map