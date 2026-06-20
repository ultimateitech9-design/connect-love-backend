"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "SupportService", {
    enumerable: true,
    get: function() {
        return SupportService;
    }
});
const _common = require("@nestjs/common");
const _typeorm = require("@nestjs/typeorm");
const _typeorm1 = require("typeorm");
const _contactentity = require("./contact.entity");
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
let SupportService = class SupportService {
    async createContact(dto) {
        const contact = this.contactRepo.create(dto);
        const saved = await this.contactRepo.save(contact);
        return {
            message: 'Your message has been received. We will respond within 24 hours.',
            id: saved.id
        };
    }
    async subscribeNewsletter(email) {
        const contact = this.contactRepo.create({
            name: 'Newsletter subscriber',
            email,
            subject: 'Newsletter subscription',
            message: 'User subscribed from the public website footer newsletter form.',
            status: 'newsletter'
        });
        try {
            const saved = await this.contactRepo.save(contact);
            return {
                message: 'You are subscribed to Connect Love updates.',
                id: saved.id
            };
        } catch  {
            return {
                message: 'You are subscribed to Connect Love updates.',
                id: 0
            };
        }
    }
    async findAll() {
        return this.contactRepo.find({
            order: {
                createdAt: 'DESC'
            }
        });
    }
    dayKey(date) {
        return date.toLocaleString('en-US', {
            weekday: 'short'
        });
    }
    async overview() {
        const contacts = await this.findAll();
        const trend = {};
        contacts.forEach((ticket)=>{
            const day = this.dayKey(ticket.createdAt);
            trend[day] ||= {
                day,
                received: 0,
                resolved: 0
            };
            trend[day].received += 1;
            if (ticket.status === 'closed' || ticket.status === 'resolved') trend[day].resolved += 1;
        });
        const complaintMix = Object.entries(contacts.reduce((acc, ticket)=>{
            acc[ticket.subject] = (acc[ticket.subject] || 0) + 1;
            return acc;
        }, {})).map(([name, value])=>({
                name,
                value
            })).slice(0, 5);
        return {
            stats: {
                totalTickets: contacts.length,
                resolvedToday: contacts.filter((c)=>c.status === 'closed' || c.status === 'resolved').length,
                openTickets: contacts.filter((c)=>c.status === 'open').length,
                escalated: contacts.filter((c)=>c.status === 'escalated').length
            },
            ticketTrend: Object.values(trend),
            complaintMix,
            recent: contacts.slice(0, 8)
        };
    }
    async findTickets(status) {
        if (status && status !== 'all') {
            return this.contactRepo.find({
                where: {
                    status
                },
                order: {
                    createdAt: 'DESC'
                }
            });
        }
        return this.findAll();
    }
    async updateStatus(id, status) {
        const ticket = await this.contactRepo.findOne({
            where: {
                id
            }
        });
        if (!ticket) throw new _common.NotFoundException('Ticket not found.');
        ticket.status = status;
        return this.contactRepo.save(ticket);
    }
    constructor(contactRepo){
        this.contactRepo = contactRepo;
    }
};
SupportService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_param(0, (0, _typeorm.InjectRepository)(_contactentity.Contact)),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _typeorm1.Repository === "undefined" ? Object : _typeorm1.Repository
    ])
], SupportService);

//# sourceMappingURL=support.service.js.map