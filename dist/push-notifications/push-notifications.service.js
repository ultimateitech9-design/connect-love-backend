"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "PushNotificationsService", {
    enumerable: true,
    get: function() {
        return PushNotificationsService;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _app = require("firebase-admin/app");
const _messaging = require("firebase-admin/messaging");
const _typeorm1 = require("typeorm");
const _userentity = require("../users/user.entity");
const _userdeviceentity = require("./user-device.entity");
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
let PushNotificationsService = class PushNotificationsService {
    onModuleInit() {
        this.initializeFirebase();
    }
    initializeFirebase() {
        try {
            if ((0, _app.getApps)().length > 0) {
                this.firebaseApp = (0, _app.getApps)()[0];
                return;
            }
            const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
            const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
            const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n').trim();
            const useApplicationDefault = Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS);
            if (projectId && clientEmail && privateKey) {
                this.firebaseApp = (0, _app.initializeApp)({
                    credential: (0, _app.cert)({
                        projectId,
                        clientEmail,
                        privateKey
                    }),
                    projectId
                });
            } else if (useApplicationDefault) {
                this.firebaseApp = (0, _app.initializeApp)({
                    credential: (0, _app.applicationDefault)(),
                    ...projectId ? {
                        projectId
                    } : {}
                });
            } else {
                this.logger.warn('Firebase credentials are not configured. Device registration works, but push delivery is disabled.');
            }
        } catch (error) {
            this.firebaseApp = null;
            this.logger.error(`Firebase initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    isConfigured() {
        return Boolean(this.firebaseApp);
    }
    async registerDevice(userId, dto) {
        const token = dto.token.trim();
        const deviceId = dto.deviceId?.trim() || null;
        const now = new Date();
        let device = await this.deviceRepo.findOne({
            where: {
                token
            }
        });
        if (!device) {
            device = this.deviceRepo.create({
                token,
                userId
            });
        }
        device.userId = userId;
        device.platform = dto.platform;
        device.deviceId = deviceId;
        device.deviceName = dto.deviceName?.trim() || null;
        device.appVersion = dto.appVersion?.trim() || null;
        device.isActive = true;
        device.lastSeenAt = now;
        device = await this.deviceRepo.save(device);
        if (deviceId) {
            await this.deviceRepo.update({
                userId,
                deviceId,
                id: (0, _typeorm1.Not)(device.id),
                isActive: true
            }, {
                isActive: false
            });
        }
        return this.publicDevice(device);
    }
    async listDevices(userId) {
        const devices = await this.deviceRepo.find({
            where: {
                userId
            },
            order: {
                lastSeenAt: 'DESC'
            }
        });
        return devices.map((device)=>this.publicDevice(device));
    }
    async unregisterDevice(userId, dto) {
        const token = dto.token?.trim();
        const deviceId = dto.deviceId?.trim();
        if (!token && !deviceId) {
            throw new _common.BadRequestException('token or deviceId is required.');
        }
        const result = token ? await this.deviceRepo.update({
            userId,
            token,
            isActive: true
        }, {
            isActive: false
        }) : await this.deviceRepo.update({
            userId,
            deviceId,
            isActive: true
        }, {
            isActive: false
        });
        return {
            unregistered: result.affected || 0
        };
    }
    async unregisterAllDevices(userId) {
        const result = await this.deviceRepo.update({
            userId,
            isActive: true
        }, {
            isActive: false
        });
        return {
            unregistered: result.affected || 0
        };
    }
    async sendToUser(userId, message) {
        const user = await this.userRepo.findOne({
            where: {
                id: userId
            },
            select: [
                'id',
                'notifyPush'
            ]
        });
        if (!user?.notifyPush) return this.emptyDeliveryResult();
        const devices = await this.deviceRepo.find({
            where: {
                userId,
                isActive: true
            }
        });
        return this.sendToDevices(devices, message);
    }
    async sendToUsers(userIds, message) {
        if (userIds.length === 0) return this.emptyDeliveryResult();
        const devices = await this.deviceRepo.createQueryBuilder('device').innerJoin(_userentity.User, 'user', 'user.id = device.userId AND user.notifyPush = :notifyPush', {
            notifyPush: true
        }).where('device.userId IN (:...userIds)', {
            userIds: [
                ...new Set(userIds)
            ]
        }).andWhere('device.isActive = :isActive', {
            isActive: true
        }).getMany();
        return this.sendToDevices(devices, message);
    }
    async sendToDevices(devices, message) {
        if (!this.firebaseApp || devices.length === 0) {
            return {
                ...this.emptyDeliveryResult(),
                configured: Boolean(this.firebaseApp)
            };
        }
        const result = {
            configured: true,
            attempted: devices.length,
            delivered: 0,
            failed: 0,
            deactivated: 0
        };
        const data = Object.fromEntries(Object.entries(message.data || {}).filter(([, value])=>value !== null && value !== undefined).map(([key, value])=>[
                key,
                String(value)
            ]));
        for(let offset = 0; offset < devices.length; offset += 500){
            const batch = devices.slice(offset, offset + 500);
            const payload = {
                tokens: batch.map((device)=>device.token),
                notification: {
                    title: message.title,
                    body: message.body
                },
                data,
                android: {
                    priority: 'high'
                },
                apns: {
                    payload: {
                        aps: {
                            sound: 'default'
                        }
                    }
                }
            };
            const response = await (0, _messaging.getMessaging)(this.firebaseApp).sendEachForMulticast(payload);
            result.delivered += response.successCount;
            result.failed += response.failureCount;
            const invalidDeviceIds = response.responses.map((item, index)=>({
                    item,
                    deviceId: batch[index].id
                })).filter(({ item })=>{
                const code = item.error?.code;
                return code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token';
            }).map(({ deviceId })=>deviceId);
            if (invalidDeviceIds.length > 0) {
                await this.deviceRepo.createQueryBuilder().update(_userdeviceentity.UserDevice).set({
                    isActive: false
                }).whereInIds(invalidDeviceIds).execute();
                result.deactivated += invalidDeviceIds.length;
            }
        }
        return result;
    }
    emptyDeliveryResult() {
        return {
            configured: Boolean(this.firebaseApp),
            attempted: 0,
            delivered: 0,
            failed: 0,
            deactivated: 0
        };
    }
    publicDevice(device) {
        return {
            id: device.id,
            platform: device.platform,
            deviceId: device.deviceId,
            deviceName: device.deviceName,
            appVersion: device.appVersion,
            isActive: device.isActive,
            tokenPreview: `${device.token.slice(0, 8)}…${device.token.slice(-6)}`,
            lastSeenAt: device.lastSeenAt,
            createdAt: device.createdAt,
            updatedAt: device.updatedAt
        };
    }
    constructor(deviceRepo, userRepo){
        this.deviceRepo = deviceRepo;
        this.userRepo = userRepo;
        this.logger = new _common.Logger(PushNotificationsService.name);
        this.firebaseApp = null;
    }
};
PushNotificationsService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_param(0, (0, _typeorm.InjectRepository)(_userdeviceentity.UserDevice)),
    _ts_param(1, (0, _typeorm.InjectRepository)(_userentity.User)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository,
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository
    ])
], PushNotificationsService);

//# sourceMappingURL=push-notifications.service.js.map