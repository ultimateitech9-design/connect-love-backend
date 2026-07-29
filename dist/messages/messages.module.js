"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "MessagesModule", {
    enumerable: true,
    get: function() {
        return MessagesModule;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _messageentity = require("./message.entity");
const _messagesservice = require("./messages.service");
const _messagescontroller = require("./messages.controller");
const _matchentity = require("../matches/match.entity");
const _messagesgateway = require("./messages.gateway");
const _videocallentity = require("./video-call.entity");
const _videocallsservice = require("./video-calls.service");
const _videocallscontroller = require("./video-calls.controller");
const _usersmodule = require("../users/users.module");
const _matchesmodule = require("../matches/matches.module");
const _authmodule = require("../auth/auth.module");
const _userentity = require("../users/user.entity");
const _pushnotificationsmodule = require("../push-notifications/push-notifications.module");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let MessagesModule = class MessagesModule {
};
MessagesModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _typeorm.TypeOrmModule.forFeature([
                _messageentity.Message,
                _matchentity.MatchRelation,
                _videocallentity.VideoCall,
                _userentity.User
            ]),
            _usersmodule.UsersModule,
            _matchesmodule.MatchesModule,
            _authmodule.AuthModule,
            _pushnotificationsmodule.PushNotificationsModule
        ],
        providers: [
            _messagesservice.MessagesService,
            _videocallsservice.VideoCallsService,
            _messagesgateway.MessagesGateway
        ],
        controllers: [
            _messagescontroller.MessagesController,
            _videocallscontroller.VideoCallsController
        ],
        exports: [
            _messagesservice.MessagesService,
            _videocallsservice.VideoCallsService
        ]
    })
], MessagesModule);

//# sourceMappingURL=messages.module.js.map