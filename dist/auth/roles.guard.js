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
    get ROLES_KEY () {
        return ROLES_KEY;
    },
    get Roles () {
        return Roles;
    },
    get RolesGuard () {
        return RolesGuard;
    }
});
const _common = require("@nestjs/common");
const _core = require("@nestjs/core");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
const ROLES_KEY = 'roles';
const Roles = (...roles)=>(0, _common.SetMetadata)(ROLES_KEY, roles);
let RolesGuard = class RolesGuard {
    canActivate(context) {
        const requiredRoles = this.reflector.getAllAndOverride(ROLES_KEY, [
            context.getHandler(),
            context.getClass()
        ]);
        if (!requiredRoles) {
            return true;
        }
        const { user } = context.switchToHttp().getRequest();
        // Check if the user object exists and has one of the required roles
        return user && user.role && requiredRoles.includes(user.role);
    }
    constructor(reflector){
        this.reflector = reflector;
    }
};
RolesGuard = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _core.Reflector === "undefined" ? Object : _core.Reflector
    ])
], RolesGuard);

//# sourceMappingURL=roles.guard.js.map