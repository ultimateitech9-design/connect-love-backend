import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SupportService } from './support.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { CreateNewsletterSubscriptionDto } from './dto/create-newsletter-subscription.dto';
import { Roles, RolesGuard } from '../auth/roles.guard';

@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  // Public endpoint — anyone can submit a contact form
  @Post('contact')
  createContact(@Body() dto: CreateContactDto) {
    return this.supportService.createContact(dto);
  }

  @Post('newsletter')
  subscribeNewsletter(@Body() dto: CreateNewsletterSubscriptionDto) {
    return this.supportService.subscribeNewsletter(dto.email);
  }

  // Admin only — list all contact submissions
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('support', 'admin', 'super_admin')
  @Get('contacts')
  findAll() {
    return this.supportService.findAll();
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('support', 'admin', 'super_admin')
  @Get('overview')
  overview() {
    return this.supportService.overview();
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('support', 'admin', 'super_admin')
  @Get('tickets')
  tickets(@Query('status') status?: string) {
    return this.supportService.findTickets(status);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('support', 'admin', 'super_admin')
  @Patch('tickets/:id/status')
  updateTicket(@Param('id') id: string, @Body('status') status: string) {
    return this.supportService.updateStatus(Number(id), status);
  }
}
