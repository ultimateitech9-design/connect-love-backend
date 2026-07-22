import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateDivorcedLeadDto } from './divorced.dto';
import { DivorcedLead } from './divorced-lead.entity';

@Injectable()
export class DivorcedService {
  constructor(
    @InjectRepository(DivorcedLead)
    private readonly leadRepository: Repository<DivorcedLead>,
  ) {}

  async createLead(dto: CreateDivorcedLeadDto) {
    const lead = await this.leadRepository.save(this.leadRepository.create(dto));
    return { id: lead.id, message: 'Preferences saved. Continue to create your profile.' };
  }
}
