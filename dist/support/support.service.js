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
const _nodemailer = /*#__PURE__*/ _interop_require_wildcard(require("nodemailer"));
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
let SupportService = class SupportService {
    mailer() {
        if (this.transporter) return this.transporter;
        const host = process.env.SMTP_HOST?.trim();
        const user = process.env.SMTP_USER?.trim();
        const pass = process.env.SMTP_PASSWORD;
        if (!host || !user || !pass) throw new _common.ServiceUnavailableException('Email delivery is not configured.');
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
    escapeHtml(value) {
        return value.replace(/[&<>"']/g, (character)=>({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            })[character] || character);
    }
    async sendResolutionEmail(ticket) {
        const recipient = ticket.email.trim().toLowerCase();
        const name = this.escapeHtml(ticket.name.trim() || 'Customer');
        const subject = this.escapeHtml(ticket.subject.trim());
        const fromAddress = process.env.SMTP_FROM?.trim() || process.env.SMTP_USER?.trim();
        try {
            await this.mailer().sendMail({
                from: fromAddress,
                to: recipient,
                subject: `Your Connect Love support request #${ticket.id} has been resolved`,
                text: `Hello ${ticket.name.trim() || 'Customer'},\n\nYour support request #${ticket.id} (${ticket.subject}) has been resolved by the Connect Love support team.\n\nIf you still need help, please submit a new request through Contact Us.\n\nRegards,\nConnect Love Support`,
                html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:28px;color:#172033">
            <h1 style="font-size:24px;margin:0 0 18px;color:#e11d48">Connect Love Support</h1>
            <p style="font-size:16px;line-height:1.6">Hello ${name},</p>
            <p style="font-size:16px;line-height:1.6">Your support request has been resolved by our team.</p>
            <div style="margin:22px 0;padding:18px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px">
              <div style="font-size:13px;color:#64748b">Ticket #${ticket.id}</div>
              <div style="font-size:16px;font-weight:700;margin-top:6px">${subject}</div>
              <div style="font-size:14px;color:#059669;margin-top:8px">Status: Resolved</div>
            </div>
            <p style="font-size:14px;line-height:1.6;color:#596273">If you still need help, please submit a new request through the Contact Us form.</p>
            <p style="font-size:14px;line-height:1.6">Regards,<br><strong>Connect Love Support</strong></p>
          </div>
        `
            });
        } catch  {
            throw new _common.ServiceUnavailableException('The resolution email could not be sent. Please check the email service and try again.');
        }
    }
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
        const today = new Date();
        const isToday = (date)=>{
            const value = new Date(date);
            return value.getFullYear() === today.getFullYear() && value.getMonth() === today.getMonth() && value.getDate() === today.getDate();
        };
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
                resolvedToday: contacts.filter((c)=>(c.status === 'closed' || c.status === 'resolved') && isToday(c.updatedAt || c.createdAt)).length,
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
        const wasResolved = ticket.status === 'resolved' || ticket.status === 'closed';
        const willBeResolved = status === 'resolved' || status === 'closed';
        if (willBeResolved && !wasResolved) await this.sendResolutionEmail(ticket);
        ticket.status = status;
        return this.contactRepo.save(ticket);
    }
    async deleteTicket(id) {
        const ticket = await this.contactRepo.findOne({
            where: {
                id
            }
        });
        if (!ticket) throw new _common.NotFoundException('Ticket not found.');
        await this.contactRepo.remove(ticket);
        return {
            success: true,
            id
        };
    }
    constructor(contactRepo){
        this.contactRepo = contactRepo;
        this.transporter = null;
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