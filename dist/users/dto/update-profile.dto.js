"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "UpdateProfileDto", {
    enumerable: true,
    get: function() {
        return UpdateProfileDto;
    }
});
const _classvalidator = require("class-validator");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let UpdateProfileDto = class UpdateProfileDto {
};
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(150),
    _ts_metadata("design:type", String)
], UpdateProfileDto.prototype, "name", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsDateString)(),
    _ts_metadata("design:type", String)
], UpdateProfileDto.prototype, "birthDate", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(30),
    _ts_metadata("design:type", String)
], UpdateProfileDto.prototype, "gender", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(100),
    _ts_metadata("design:type", String)
], UpdateProfileDto.prototype, "religion", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(150),
    _ts_metadata("design:type", String)
], UpdateProfileDto.prototype, "profession", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(20),
    _ts_metadata("design:type", String)
], UpdateProfileDto.prototype, "height", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(150),
    _ts_metadata("design:type", String)
], UpdateProfileDto.prototype, "city", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.IsIn)([
        'Long-term',
        'Casual',
        'Friendships',
        'Not sure yet'
    ]),
    _ts_metadata("design:type", String)
], UpdateProfileDto.prototype, "relationshipGoal", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.IsIn)([
        'Aries',
        'Taurus',
        'Gemini',
        'Cancer',
        'Leo',
        'Virgo',
        'Libra',
        'Scorpio',
        'Sagittarius',
        'Capricorn',
        'Aquarius',
        'Pisces'
    ]),
    _ts_metadata("design:type", String)
], UpdateProfileDto.prototype, "zodiac", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsArray)(),
    (0, _classvalidator.IsString)({
        each: true
    }),
    _ts_metadata("design:type", Array)
], UpdateProfileDto.prototype, "interests", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsArray)(),
    (0, _classvalidator.IsString)({
        each: true
    }),
    _ts_metadata("design:type", Array)
], UpdateProfileDto.prototype, "personalityWords", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    (0, _classvalidator.MaxLength)(500),
    _ts_metadata("design:type", String)
], UpdateProfileDto.prototype, "bio", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsArray)(),
    (0, _classvalidator.ArrayMaxSize)(5, {
        message: 'Maximum 5 photos allowed'
    }),
    (0, _classvalidator.IsString)({
        each: true
    }),
    _ts_metadata("design:type", Array)
], UpdateProfileDto.prototype, "photos", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsArray)(),
    (0, _classvalidator.IsString)({
        each: true
    }),
    _ts_metadata("design:type", Array)
], UpdateProfileDto.prototype, "hobbies", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsBoolean)(),
    _ts_metadata("design:type", Boolean)
], UpdateProfileDto.prototype, "onboardingCompleted", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsBoolean)(),
    _ts_metadata("design:type", Boolean)
], UpdateProfileDto.prototype, "showOnlineStatus", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsBoolean)(),
    _ts_metadata("design:type", Boolean)
], UpdateProfileDto.prototype, "showDistance", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsBoolean)(),
    _ts_metadata("design:type", Boolean)
], UpdateProfileDto.prototype, "photosVisibleToNonMatches", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsBoolean)(),
    _ts_metadata("design:type", Boolean)
], UpdateProfileDto.prototype, "onlyShowVerifiedProfiles", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsBoolean)(),
    _ts_metadata("design:type", Boolean)
], UpdateProfileDto.prototype, "notifyMessages", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsBoolean)(),
    _ts_metadata("design:type", Boolean)
], UpdateProfileDto.prototype, "notifyMatches", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsBoolean)(),
    _ts_metadata("design:type", Boolean)
], UpdateProfileDto.prototype, "notifyPush", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsBoolean)(),
    _ts_metadata("design:type", Boolean)
], UpdateProfileDto.prototype, "darkMode", void 0);
_ts_decorate([
    (0, _classvalidator.IsOptional)(),
    (0, _classvalidator.IsString)(),
    _ts_metadata("design:type", String)
], UpdateProfileDto.prototype, "language", void 0);

//# sourceMappingURL=update-profile.dto.js.map