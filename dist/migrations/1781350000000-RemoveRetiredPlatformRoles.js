"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "RemoveRetiredPlatformRoles1781350000000", {
    enumerable: true,
    get: function() {
        return RemoveRetiredPlatformRoles1781350000000;
    }
});
let RemoveRetiredPlatformRoles1781350000000 = class RemoveRetiredPlatformRoles1781350000000 {
    async up(queryRunner) {
        await queryRunner.query(`DELETE FROM platform_roles
      WHERE LOWER(REPLACE(REPLACE(TRIM(role), ' ', '_'), '-', '_')) IN ('data_entry', 'finance')`);
    }
    async down() {
    // Retired roles are intentionally not recreated.
    }
    constructor(){
        this.name = 'RemoveRetiredPlatformRoles1781350000000';
    }
};

//# sourceMappingURL=1781350000000-RemoveRetiredPlatformRoles.js.map