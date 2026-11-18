import { renderEmail, SITE_URL } from '../mail/email-layout';
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

  private async sendResolutionEmail(ticket: Contact) {
    const recipient = ticket.email.trim().toLowerCase();
    const fromAddress = process.env.SMTP_FROM?.trim() || process.env.SMTP_USER?.trim();
    try {
      await this.mailer().sendMail({
        from: fromAddress,
        to: recipient,
        subject: `Your Connect Love support request #${ticket.id} has been resolved`,
        ...renderEmail({
          preheader: `Ticket #${ticket.id} has been resolved`,
          title: 'Your support request is resolved',
          greeting: `Hello ${ticket.name.trim() || 'there'},`,
          paragraphs: ['Our support team has resolved your request.'],
          details: [
            { label: 'Ticket', value: `#${ticket.id}` },
            { label: 'Subject', value: ticket.subject.trim() },
            { label: 'Status', value: 'Resolved' },
          ],
          button: { label: 'Open Connect Love', url: SITE_URL },
          note: 'Still need help? Send us a new request from the Contact Us page.',
        }),
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

  async deleteTicket(id: number): Promise<{ success: true; id: number }> {
    const ticket = await this.contactRepo.findOne({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found.');
    await this.contactRepo.remove(ticket);
    return { success: true, id };
  }
}
