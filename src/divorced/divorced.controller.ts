import { Body, Controller, Post } from '@nestjs/common';
import { CreateDivorcedLeadDto } from './divorced.dto';
import { DivorcedService } from './divorced.service';

@Controller('divorced')
export class DivorcedController {
  constructor(private readonly divorcedService: DivorcedService) {}

  @Post('lead')
  createLead(@Body() body: CreateDivorcedLeadDto) {
    return this.divorcedService.createLead(body);
  }
}
