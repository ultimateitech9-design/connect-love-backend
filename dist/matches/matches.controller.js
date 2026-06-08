"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "MatchesController", {
    enumerable: true,
    get: function() {
        return MatchesController;
    }
});
const _common = require("@nestjs/common");
const _matchesservice = require("./matches.service");
const _matchentity = require("./match.entity");
const _passport = require("@nestjs/passport");
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
let MatchesController = class MatchesController {
    async getMatches(filter, req) {
        const userId = req.user.userId;
        const allMatches = await this.matchesService.findAll(userId);
        if (filter === 'active') {
            return allMatches.filter((m)=>m.status === _matchentity.MatchStatus.MATCHED);
        } else if (filter === 'sent') {
            return allMatches.filter((m)=>m.status === _matchentity.MatchStatus.PENDING && m.senderId === userId);
        } else if (filter === 'received') {
            return allMatches.filter((m)=>m.status === _matchentity.MatchStatus.PENDING && m.receiverId === userId);
        } else if (filter === 'blocked') {
            return allMatches.filter((m)=>m.status === _matchentity.MatchStatus.BLOCKED && m.senderId === userId);
        }
        return allMatches;
    }
    async swipeProfile(req, receiverId, action) {
        const userId = req.user.userId;
        return this.matchesService.swipe(userId, receiverId, action);
    }
    async unblockUser(req, id) {
        // Delete the blocked relation so they return to discovery
        return this.matchesService.delete(id, req.user.userId);
    }
    async blockUser(req, id) {
        return this.matchesService.blockMatch(id, req.user.userId);
    }
    async respond(req, matchId, action) {
        return this.matchesService.respond(matchId, action, req.user.userId);
    }
    constructor(matchesService){
        this.matchesService = matchesService;
    }
};
_ts_decorate([
    (0, _common.Get)(),
    _ts_param(0, (0, _common.Query)('filter')),
    _ts_param(1, (0, _common.Request)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        String,
        void 0
    ]),
    _ts_metadata("design:returntype", Promise)
], MatchesController.prototype, "getMatches", null);
_ts_decorate([
    (0, _common.Post)('swipe'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)('receiverId')),
    _ts_param(2, (0, _common.Body)('action')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        void 0,
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], MatchesController.prototype, "swipeProfile", null);
_ts_decorate([
    (0, _common.Patch)('unblock/:id'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        void 0,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], MatchesController.prototype, "unblockUser", null);
_ts_decorate([
    (0, _common.Patch)('block/:id'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Param)('id')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        void 0,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], MatchesController.prototype, "blockUser", null);
_ts_decorate([
    (0, _common.Post)('respond'),
    _ts_param(0, (0, _common.Request)()),
    _ts_param(1, (0, _common.Body)('matchId')),
    _ts_param(2, (0, _common.Body)('action')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        void 0,
        String,
        String
    ]),
    _ts_metadata("design:returntype", Promise)
], MatchesController.prototype, "respond", null);
MatchesController = _ts_decorate([
    (0, _common.UseGuards)((0, _passport.AuthGuard)('jwt')),
    (0, _common.Controller)('matches'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _matchesservice.MatchesService === "undefined" ? Object : _matchesservice.MatchesService
    ])
], MatchesController);

//# sourceMappingURL=matches.controller.js.map