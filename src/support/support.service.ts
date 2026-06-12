import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from './contact.entity';
import { CreateContactDto } from './dto/create-contact.dto';

@Injectable()
export class SupportService {
  constructor(
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
  ) {}

  async createContact(dto: CreateContactDto): Promise<{ message: string; id: number }> {
    const contact = this.contactRepo.create(dto);
    const saved = await this.contactRepo.save(contact);
    return { message: 'Your message has been received. We will respond within 24 hours.', id: saved.id };
  }

  async findAll(): Promise<Contact[]> {
    return this.contactRepo.find({ order: { createdAt: 'DESC' } });
  }

  private dayKey(date: Date) {
    return date.toLocaleString('en-US', { weekday: 'short' });
  }

  async overview() {
    const contacts = await this.findAll();
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
        resolvedToday: contacts.filter((c) => c.status === 'closed' || c.status === 'resolved').length,
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
    ticket.status = status;
    return this.contactRepo.save(ticket);
  }
}
