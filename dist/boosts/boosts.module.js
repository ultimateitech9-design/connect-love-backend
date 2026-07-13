"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "BoostsModule", {
    enumerable: true,
    get: function() {
        return BoostsModule;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _boostentity = require("./boost.entity");
const _boostscontroller = require("./boosts.controller");
const _boostsservice = require("./boosts.service");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let BoostsModule = class BoostsModule {
};
BoostsModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _typeorm.TypeOrmModule.forFeature([
                _boostentity.ProfileBoost
            ])
        ],
        controllers: [
            _boostscontroller.BoostsController
        ],
        providers: [
            _boostsservice.BoostsService
        ],
        exports: [
            _boostsservice.BoostsService
        ]
    })
], BoostsModule);

//# sourceMappingURL=boosts.module.js.map