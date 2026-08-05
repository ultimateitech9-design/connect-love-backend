"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "RazorpayPayments1785071000000", {
    enumerable: true,
    get: function() {
        return RazorpayPayments1785071000000;
    }
});
const _typeorm = require("typeorm");
let RazorpayPayments1785071000000 = class RazorpayPayments1785071000000 {
    async up(queryRunner) {
        const paymentColumns = [
            new _typeorm.TableColumn({
                name: 'gateway',
                type: 'varchar',
                length: '30',
                default: "'razorpay'"
            }),
            new _typeorm.TableColumn({
                name: 'gatewayOrderId',
                type: 'varchar',
                length: '80',
                isNullable: true,
                isUnique: true
            }),
            new _typeorm.TableColumn({
                name: 'gatewayPaymentId',
                type: 'varchar',
                length: '80',
                isNullable: true,
                isUnique: true
            })
        ];
        for (const column of paymentColumns){
            if (!await queryRunner.hasColumn('payments', column.name)) await queryRunner.addColumn('payments', column);
        }
        if (!await queryRunner.hasColumn('users', 'planExpiresAt')) {
            await queryRunner.addColumn('users', new _typeorm.TableColumn({
                name: 'planExpiresAt',
                type: 'datetime',
                isNullable: true
            }));
        }
        if (await queryRunner.hasTable('subscription_plans')) {
            await queryRunner.query("UPDATE subscription_plans SET displayName = 'Free', price = 0, currency = 'INR' WHERE name = 'free'");
            await queryRunner.query("UPDATE subscription_plans SET displayName = 'Gold', price = 199, currency = 'INR' WHERE name = 'gold'");
            await queryRunner.query("UPDATE subscription_plans SET displayName = 'Diamond', price = 399, currency = 'INR' WHERE name = 'platinum'");
        }
    }
    async down() {
    // Preserve billing identifiers and expiry history once payment processing has started.
    }
    constructor(){
        this.name = 'RazorpayPayments1785071000000';
    }
};

//# sourceMappingURL=1785071000000-RazorpayPayments.js.map