"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "CoinTransaction", {
    enumerable: true,
    get: function() {
        return CoinTransaction;
    }
});
const _typeorm = require("typeorm");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let CoinTransaction = class CoinTransaction {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)('uuid'),
    _ts_metadata("design:type", String)
], CoinTransaction.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'varchar',
        length: 20
    }),
    _ts_metadata("design:type", typeof CoinTransactionType === "undefined" ? Object : CoinTransactionType)
], CoinTransaction.prototype, "type", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'varchar',
        length: 20,
        default: 'completed'
    }),
    _ts_metadata("design:type", typeof CoinTransactionStatus === "undefined" ? Object : CoinTransactionStatus)
], CoinTransaction.prototype, "status", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'char',
        length: 36,
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], CoinTransaction.prototype, "userId", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'char',
        length: 36,
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], CoinTransaction.prototype, "senderId", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'char',
        length: 36,
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], CoinTransaction.prototype, "receiverId", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        unsigned: true
    }),
    _ts_metadata("design:type", Number)
], CoinTransaction.prototype, "grossCoins", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        unsigned: true,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], CoinTransaction.prototype, "userCoins", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'int',
        unsigned: true,
        default: 0
    }),
    _ts_metadata("design:type", Number)
], CoinTransaction.prototype, "platformCoins", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'varchar',
        length: 120,
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], CoinTransaction.prototype, "label", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'varchar',
        length: 160,
        nullable: true
    }),
    _ts_metadata("design:type", Object)
], CoinTransaction.prototype, "payoutAccount", void 0);
_ts_decorate([
    (0, _typeorm.CreateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], CoinTransaction.prototype, "createdAt", void 0);
CoinTransaction = _ts_decorate([
    (0, _typeorm.Entity)('coin_transactions')
], CoinTransaction);

//# sourceMappingURL=coin-transaction.entity.js.map