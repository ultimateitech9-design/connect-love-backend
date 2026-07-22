"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "DivorcedModule", {
    enumerable: true,
    get: function() {
        return DivorcedModule;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _divorcedcontroller = require("./divorced.controller");
const _divorcedleadentity = require("./divorced-lead.entity");
const _divorcedservice = require("./divorced.service");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let DivorcedModule = class DivorcedModule {
};
DivorcedModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _typeorm.TypeOrmModule.forFeature([
                _divorcedleadentity.DivorcedLead
            ])
        ],
        controllers: [
            _divorcedcontroller.DivorcedController
        ],
        providers: [
            _divorcedservice.DivorcedService
        ]
    })
], DivorcedModule);

//# sourceMappingURL=divorced.module.js.map