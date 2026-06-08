import { Injectable } from '@nestjs/common';
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
}
