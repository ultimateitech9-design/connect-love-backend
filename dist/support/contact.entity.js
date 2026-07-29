"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "Contact", {
    enumerable: true,
    get: function() {
        return Contact;
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
let Contact = class Contact {
};
_ts_decorate([
    (0, _typeorm.PrimaryGeneratedColumn)(),
    _ts_metadata("design:type", Number)
], Contact.prototype, "id", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        length: 150
    }),
    _ts_metadata("design:type", String)
], Contact.prototype, "name", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        length: 255
    }),
    _ts_metadata("design:type", String)
], Contact.prototype, "email", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        length: 40,
        nullable: true
    }),
    _ts_metadata("design:type", String)
], Contact.prototype, "phone", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        name: 'photo_data_url',
        type: 'longtext',
        nullable: true
    }),
    _ts_metadata("design:type", String)
], Contact.prototype, "photoDataUrl", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        length: 255
    }),
    _ts_metadata("design:type", String)
], Contact.prototype, "subject", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        type: 'text'
    }),
    _ts_metadata("design:type", String)
], Contact.prototype, "message", void 0);
_ts_decorate([
    (0, _typeorm.Column)({
        default: 'open',
        length: 30
    }),
    _ts_metadata("design:type", String)
], Contact.prototype, "status", void 0);
_ts_decorate([
    (0, _typeorm.CreateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], Contact.prototype, "createdAt", void 0);
_ts_decorate([
    (0, _typeorm.UpdateDateColumn)(),
    _ts_metadata("design:type", typeof Date === "undefined" ? Object : Date)
], Contact.prototype, "updatedAt", void 0);
Contact = _ts_decorate([
    (0, _typeorm.Entity)('contacts')
], Contact);

//# sourceMappingURL=contact.entity.js.map