"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "DiscoveryModule", {
    enumerable: true,
    get: function() {
        return DiscoveryModule;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _discoveryservice = require("./discovery.service");
const _discoverycontroller = require("./discovery.controller");
const _userentity = require("../users/user.entity");
const _searchmodule = require("../search/search.module");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let DiscoveryModule = class DiscoveryModule {
};
DiscoveryModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _typeorm.TypeOrmModule.forFeature([
                _userentity.User
            ]),
            _searchmodule.SearchModule
        ],
        providers: [
            _discoveryservice.DiscoveryService
        ],
        controllers: [
            _discoverycontroller.DiscoveryController
        ]
    })
], DiscoveryModule);

//# sourceMappingURL=discovery.module.js.map