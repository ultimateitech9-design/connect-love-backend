"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "RegistrationOtpService", {
    enumerable: true,
    get: function() {
        return RegistrationOtpService;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _crypto = require("crypto");
const _typeorm1 = require("typeorm");
const _nodemailer = /*#__PURE__*/ _interop_require_wildcard(require("nodemailer"));
const _userentity = require("../users/user.entity");
const _emailregistrationotpentity = require("./email-registration-otp.entity");
function _getRequireWildcardCache(nodeInterop) {
    if (typeof WeakMap !== "function") return null;
    var cacheBabelInterop = new WeakMap();
    var cacheNodeInterop = new WeakMap();
    return (_getRequireWildcardCache = function(nodeInterop) {
        return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
    })(nodeInterop);
}
function _interop_require_wildcard(obj, nodeInterop) {
    if (!nodeInterop && obj && obj.__esModule) {
        return obj;
    }
    if (obj === null || typeof obj !== "object" && typeof obj !== "function") {
        return {
            default: obj
        };
    }
    var cache = _getRequireWildcardCache(nodeInterop);
    if (cache && cache.has(obj)) {
        return cache.get(obj);
    }
    var newObj = {
        __proto__: null
    };
    var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;
    for(var key in obj){
        if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) {
            var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;
            if (desc && (desc.get || desc.set)) {
                Object.defineProperty(newObj, key, desc);
            } else {
                newObj[key] = obj[key];
            }
        }
    }
    newObj.default = obj;
    if (cache) {
        cache.set(obj, newObj);
    }
    return newObj;
}
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
function _ts_param(paramIndex, decorator) {
    return function(target, key) {
        decorator(target, key, paramIndex);
    };
}
const OTP_EXPIRY_MINUTES = 10;
const OTP_RESEND_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;
const OTP_MAX_SENDS_PER_HOUR = 5;
let RegistrationOtpService = class RegistrationOtpService {
    normalizeEmail(email) {
        return email.trim().toLowerCase();
    }
    otpSecret() {
        const secret = process.env.OTP_HASH_SECRET?.trim() || process.env.JWT_SECRET?.trim();
        if (!secret) {
            throw new _common.ServiceUnavailableException('OTP service is not configured.');
        }
        return secret;
    }
    hashOtp(email, otp) {
        return (0, _crypto.createHmac)('sha256', this.otpSecret()).update(`${email}:${otp}`).digest('hex');
    }
    mailer() {
        if (this.transporter) return this.transporter;
        const host = process.env.SMTP_HOST?.trim();
        const user = process.env.SMTP_USER?.trim();
        const pass = process.env.SMTP_PASSWORD;
        if (!host || !user || !pass) {
            throw new _common.ServiceUnavailableException('Email delivery is not configured.');
        }
        const port = Number(process.env.SMTP_PORT || 465);
        const secure = (process.env.SMTP_SECURE || String(port === 465)).toLowerCase() === 'true';
        this.transporter = _nodemailer.createTransport({
            host,
            port,
            secure,
            auth: {
                user,
                pass
            },
            connectionTimeout: 15_000,
            greetingTimeout: 15_000,
            socketTimeout: 20_000
        });
        return this.transporter;
    }
    async request(emailInput) {
        const email = this.normalizeEmail(emailInput);
        const existingUser = await this.userRepo.findOne({
            where: {
                email
            }
        });
        if (existingUser) {
            throw new _common.ConflictException('An account with this email already exists.');
        }
        const now = new Date();
        const current = await this.otpRepo.findOne({
            where: {
                email
            }
        });
        if (current) {
            const elapsedMs = now.getTime() - current.lastSentAt.getTime();
            if (elapsedMs < OTP_RESEND_SECONDS * 1000) {
                const waitSeconds = Math.ceil((OTP_RESEND_SECONDS * 1000 - elapsedMs) / 1000);
                throw new _common.HttpException(`Please wait ${waitSeconds} seconds before requesting another OTP.`, _common.HttpStatus.TOO_MANY_REQUESTS);
            }
        }
        const oneHourMs = 60 * 60 * 1000;
        const sameWindow = current && now.getTime() - current.sendWindowStartedAt.getTime() < oneHourMs;
        if (sameWindow && current.sendCount >= OTP_MAX_SENDS_PER_HOUR) {
            throw new _common.HttpException('Too many OTP requests. Please try again in one hour.', _common.HttpStatus.TOO_MANY_REQUESTS);
        }
        const otp = (0, _crypto.randomInt)(100000, 1000000).toString();
        const challenge = this.otpRepo.create({
            email,
            otpHash: this.hashOtp(email, otp),
            expiresAt: new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000),
            attempts: 0,
            lastSentAt: now,
            sendWindowStartedAt: sameWindow ? current.sendWindowStartedAt : now,
            sendCount: sameWindow ? current.sendCount + 1 : 1
        });
        await this.otpRepo.save(challenge);
        const fromAddress = process.env.SMTP_FROM?.trim() || process.env.SMTP_USER?.trim();
        try {
            await this.mailer().sendMail({
                from: fromAddress,
                to: email,
                subject: `${otp} is your Connect Love verification code`,
                text: `Your Connect Love verification code is ${otp}. It expires in ${OTP_EXPIRY_MINUTES} minutes. Never share this code with anyone.`,
                html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px;color:#172033">
            <h1 style="font-size:24px;margin:0 0 12px;color:#e11d48">Connect Love</h1>
            <p style="font-size:16px;line-height:1.6">Use this verification code to finish creating your account:</p>
            <div style="font-size:34px;font-weight:800;letter-spacing:8px;text-align:center;padding:20px;margin:22px 0;background:#fff1f2;border-radius:14px;color:#be123c">${otp}</div>
            <p style="font-size:14px;line-height:1.6;color:#596273">This code expires in ${OTP_EXPIRY_MINUTES} minutes. Never share it with anyone. If you did not request this code, you can ignore this email.</p>
          </div>
        `
            });
        } catch  {
            await this.otpRepo.delete({
                email
            });
            throw new _common.ServiceUnavailableException('We could not send the OTP email. Please try again.');
        }
        return {
            message: 'OTP sent successfully.',
            expiresInSeconds: OTP_EXPIRY_MINUTES * 60
        };
    }
    async verify(emailInput, otp) {
        const email = this.normalizeEmail(emailInput);
        const challenge = await this.otpRepo.findOne({
            where: {
                email
            }
        });
        if (!challenge) {
            throw new _common.UnauthorizedException('Request a new OTP before creating your account.');
        }
        if (challenge.expiresAt.getTime() <= Date.now()) {
            await this.otpRepo.delete({
                email
            });
            throw new _common.UnauthorizedException('This OTP has expired. Please request a new one.');
        }
        if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
            await this.otpRepo.delete({
                email
            });
            throw new _common.UnauthorizedException('Too many incorrect attempts. Please request a new OTP.');
        }
        const supplied = Buffer.from(this.hashOtp(email, otp), 'hex');
        const stored = Buffer.from(challenge.otpHash, 'hex');
        if (supplied.length !== stored.length || !(0, _crypto.timingSafeEqual)(supplied, stored)) {
            challenge.attempts += 1;
            if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
                await this.otpRepo.delete({
                    email
                });
                throw new _common.UnauthorizedException('Too many incorrect attempts. Please request a new OTP.');
            }
            await this.otpRepo.save(challenge);
            throw new _common.UnauthorizedException('The OTP is incorrect. Please try again.');
        }
        await this.otpRepo.delete({
            email
        });
        return email;
    }
    constructor(otpRepo, userRepo){
        this.otpRepo = otpRepo;
        this.userRepo = userRepo;
        this.transporter = null;
    }
};
RegistrationOtpService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_param(0, (0, _typeorm.InjectRepository)(_emailregistrationotpentity.EmailRegistrationOtp)),
    _ts_param(1, (0, _typeorm.InjectRepository)(_userentity.User)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository
    ])
], RegistrationOtpService);

//# sourceMappingURL=registration-otp.service.js.map