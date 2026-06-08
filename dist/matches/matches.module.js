"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "MatchesModule", {
    enumerable: true,
    get: function() {
        return MatchesModule;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _matchescontroller = require("./matches.controller");
const _matchesservice = require("./matches.service");
const _matchentity = require("./match.entity");
const _messageentity = require("../messages/message.entity");
const _userentity = require("../users/user.entity");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let MatchesModule = class MatchesModule {
};
MatchesModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _typeorm.TypeOrmModule.forFeature([
                _matchentity.MatchRelation,
                _messageentity.Message,
                _userentity.User
            ])
        ],
        controllers: [
            _matchescontroller.MatchesController
        ],
        providers: [
            _matchesservice.MatchesService
        ],
        exports: [
            _matchesservice.MatchesService
        ]
    })
], MatchesModule);

//# sourceMappingURL=matches.module.js.map