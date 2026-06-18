"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "UsersService", {
    enumerable: true,
    get: function() {
        return UsersService;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _typeorm1 = require("typeorm");
const _userentity = require("./user.entity");
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
const normalizeTags = (tags)=>{
    if (!tags || !Array.isArray(tags)) return tags;
    return [
        ...new Set(tags.map((t)=>t.trim().toLowerCase().replace(/\b\w/g, (l)=>l.toUpperCase())).filter(Boolean))
    ];
};
let UsersService = class UsersService {
    serializeUser(user) {
        return {
            ...user,
            age: user.age,
            avatarUrl: user.avatarUrl,
            photos: user.photos || [],
            photosVisibleToNonMatches: true,
            interests: user.interests || [],
            personalityWords: user.personalityWords || [],
            personality: user.personalityWords || [],
            hobbies: user.hobbies || []
        };
    }
    async findById(id) {
        const user = await this.userRepo.findOne({
            where: {
                id
            }
        });
        if (!user) throw new _common.NotFoundException('User not found.');
        return this.serializeUser(user);
    }
    async findProfileDetails(id) {
        const user = await this.userRepo.findOne({
            where: {
                id
            }
        });
        if (!user) throw new _common.NotFoundException('User not found.');
        return {
            id: user.id,
            name: user.name,
            age: user.age,
            birthDate: user.birthDate,
            gender: user.gender,
            profession: user.profession,
            height: user.height,
            city: user.city,
            bio: user.bio,
            interests: user.interests || [],
            personality: user.personalityWords || [],
            hobbies: user.hobbies || [],
            avatarUrl: user.avatarUrl,
            photos: user.photos || [],
            photosVisibleToNonMatches: true,
            isVerified: user.isVerified
        };
    }
    async findAll() {
        return this.userRepo.find({
            order: {
                createdAt: 'DESC'
            }
        });
    }
    async update(id, data) {
        const sanitizedData = {
            ...data
        };
        if (sanitizedData.interests) {
            sanitizedData.interests = normalizeTags(sanitizedData.interests);
        }
        if (sanitizedData.personalityWords) {
            sanitizedData.personalityWords = normalizeTags(sanitizedData.personalityWords);
        }
        if (sanitizedData.hobbies) {
            sanitizedData.hobbies = normalizeTags(sanitizedData.hobbies);
        }
        sanitizedData.photosVisibleToNonMatches = true;
        // Only update fields that are part of the DTO (safe update)
        await this.userRepo.update(id, sanitizedData);
        return this.findById(id);
    }
    async remove(id) {
        const user = await this.findById(id);
        await this.userRepo.delete(id);
        return {
            message: `User ${user.name} deleted.`
        };
    }
    async removeMe(id) {
        const user = await this.findById(id);
        // TypeORM ON DELETE CASCADE will handle matches and messages automatically
        await this.userRepo.delete(id);
        return {
            message: `Your account and all associated data have been permanently deleted.`
        };
    }
    async updatePresence(userId, isOnline) {
        const updateData = {
            isOnline
        };
        if (!isOnline) {
            updateData.lastSeen = new Date();
        }
        await this.userRepo.update(userId, updateData);
    }
    constructor(userRepo){
        this.userRepo = userRepo;
    }
};
UsersService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_param(0, (0, _typeorm.InjectRepository)(_userentity.User)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository
    ])
], UsersService);

//# sourceMappingURL=users.service.js.map