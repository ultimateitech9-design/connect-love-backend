"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AdminModule", {
    enumerable: true,
    get: function() {
        return AdminModule;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _admincontroller = require("./admin.controller");
const _adminservice = require("./admin.service");
const _userentity = require("../users/user.entity");
const _contactentity = require("../support/contact.entity");
const _paymententity = require("../platform/payment.entity");
const _verificationrequestentity = require("../platform/verification-request.entity");
const _rolesguard = require("../auth/roles.guard");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let AdminModule = class AdminModule {
};
AdminModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _typeorm.TypeOrmModule.forFeature([
                _userentity.User,
                _contactentity.Contact,
                _paymententity.Payment,
                _verificationrequestentity.VerificationRequest
            ])
        ],
        controllers: [
            _admincontroller.AdminController
        ],
        providers: [
            _adminservice.AdminService,
            _rolesguard.RolesGuard
        ]
    })
], AdminModule);

//# sourceMappingURL=admin.module.js.map