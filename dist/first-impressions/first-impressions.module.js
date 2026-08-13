"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "FirstImpressionsModule", {
    enumerable: true,
    get: function() {
        return FirstImpressionsModule;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _userentity = require("../users/user.entity");
const _firstimpressionentity = require("./first-impression.entity");
const _firstimpressionscontroller = require("./first-impressions.controller");
const _firstimpressionsservice = require("./first-impressions.service");
const _pushnotificationsmodule = require("../push-notifications/push-notifications.module");
const _matchentity = require("../matches/match.entity");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let FirstImpressionsModule = class FirstImpressionsModule {
};
FirstImpressionsModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _typeorm.TypeOrmModule.forFeature([
                _firstimpressionentity.FirstImpression,
                _userentity.User,
                _matchentity.MatchRelation
            ]),
            _pushnotificationsmodule.PushNotificationsModule
        ],
        controllers: [
            _firstimpressionscontroller.FirstImpressionsController
        ],
        providers: [
            _firstimpressionsservice.FirstImpressionsService
        ]
    })
], FirstImpressionsModule);

//# sourceMappingURL=first-impressions.module.js.map