import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from './contact.entity';
import { CreateContactDto } from './dto/create-contact.dto';
import * as nodemailer from 'nodemailer';

@Injectable()
export class SupportService {
  private transporter: nodemailer.Transporter | null = null;

  constructor(
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
  ) {}

  private mailer() {
    if (this.transporter) return this.transporter;
    const host = process.env.SMTP_HOST?.trim();
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASSWORD;
    if (!host || !user || !pass) throw new ServiceUnavailableException('Email delivery is not configured.');
    const port = Number(process.env.SMTP_PORT || 465);
    const secure = (process.env.SMTP_SECURE || String(port === 465)).toLowerCase() === 'true';
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 20_000,
    });
    return this.transporter;
  }

  private escapeHtml(value: string) {
    return value.replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
    })[character] || character);
  }

  private async sendResolutionEmail(ticket: Contact) {
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
        `,
      });
    } catch {
      throw new ServiceUnavailableException('The resolution email could not be sent. Please check the email service and try again.');
    }
  }

  async createContact(dto: CreateContactDto): Promise<{ message: string; id: number }> {
    const contact = this.contactRepo.create(dto);
    const saved = await this.contactRepo.save(contact);
    return { message: 'Your message has been received. We will respond within 24 hours.', id: saved.id };
  }

  async subscribeNewsletter(email: string): Promise<{ message: string; id: number }> {
    const contact = this.contactRepo.create({
      name: 'Newsletter subscriber',
      email,
      subject: 'Newsletter subscription',
      message: 'User subscribed from the public website footer newsletter form.',
      status: 'newsletter',
    });
    try {
      const saved = await this.contactRepo.save(contact);
      return { message: 'You are subscribed to Connect Love updates.', id: saved.id };
    } catch {
      return { message: 'You are subscribed to Connect Love updates.', id: 0 };
    }
  }

  async findAll(): Promise<Contact[]> {
    return this.contactRepo.find({ order: { createdAt: 'DESC' } });
  }

  private dayKey(date: Date) {
    return date.toLocaleString('en-US', { weekday: 'short' });
  }

  async overview() {
    const contacts = await this.findAll();
    const today = new Date();
    const isToday = (date: Date) => {
      const value = new Date(date);
      return value.getFullYear() === today.getFullYear()
        && value.getMonth() === today.getMonth()
        && value.getDate() === today.getDate();
    };
    const trend: Record<string, { day: string; received: number; resolved: number }> = {};
    contacts.forEach((ticket) => {
      const day = this.dayKey(ticket.createdAt);
      trend[day] ||= { day, received: 0, resolved: 0 };
      trend[day].received += 1;
      if (ticket.status === 'closed' || ticket.status === 'resolved') trend[day].resolved += 1;
    });
    const complaintMix = Object.entries(contacts.reduce<Record<string, number>>((acc, ticket) => {
      acc[ticket.subject] = (acc[ticket.subject] || 0) + 1;
      return acc;
    }, {})).map(([name, value]) => ({ name, value })).slice(0, 5);

    return {
      stats: {
        totalTickets: contacts.length,
        resolvedToday: contacts.filter((c) => (c.status === 'closed' || c.status === 'resolved') && isToday(c.updatedAt || c.createdAt)).length,
        openTickets: contacts.filter((c) => c.status === 'open').length,
        escalated: contacts.filter((c) => c.status === 'escalated').length,
      },
      ticketTrend: Object.values(trend),
      complaintMix,
      recent: contacts.slice(0, 8),
    };
  }

  async findTickets(status?: string): Promise<Contact[]> {
    if (status && status !== 'all') {
      return this.contactRepo.find({ where: { status }, order: { createdAt: 'DESC' } });
    }
    return this.findAll();
  }

  async updateStatus(id: number, status: string): Promise<Contact> {
    const ticket = await this.contactRepo.findOne({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found.');
    const wasResolved = ticket.status === 'resolved' || ticket.status === 'closed';
    const willBeResolved = status === 'resolved' || status === 'closed';
    if (willBeResolved && !wasResolved) await this.sendResolutionEmail(ticket);
    ticket.status = status;
    return this.contactRepo.save(ticket);
  }
}
