import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SupportService } from './support.service';
import { CreateContactDto } from './dto/create-contact.dto';

@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  // Public endpoint — anyone can submit a contact form
  @Post('contact')
  createContact(@Body() dto: CreateContactDto) {
    return this.supportService.createContact(dto);
  }

  // Admin only — list all contact submissions
  @UseGuards(AuthGuard('jwt'))
  @Get('contacts')
  findAll() {
    return this.supportService.findAll();
  }
}
