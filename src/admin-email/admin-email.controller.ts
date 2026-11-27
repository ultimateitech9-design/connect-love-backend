import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { AdminEmailService } from './admin-email.service';
import { EmailRecipientsQueryDto, FailedEmailsQueryDto, RetryFailedEmailsDto, SendAdminEmailDto } from './admin-email.dto';

@Controller('api/admin-email')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('super_admin')
export class AdminEmailController {
  constructor(private readonly service: AdminEmailService) {}
  @Get('recipients') recipients(@Query() query: EmailRecipientsQueryDto) { return this.service.recipients(query); }
  @Get('failures') failures(@Query() query: FailedEmailsQueryDto) { return this.service.failures(query); }
  @Post('failures/retry') retry(@Body() dto: RetryFailedEmailsDto, @Req() req: any) { return this.service.retryFailures(dto, req.user.userId); }
  @Get('campaigns') campaigns() { return this.service.campaigns(); }
  @Get('campaigns/:id') campaign(@Param('id', ParseUUIDPipe) id: string) { return this.service.campaign(id); }
  @Post('campaigns') send(@Body() dto: SendAdminEmailDto, @Req() req: any) { return this.service.enqueue(dto, req.user.userId); }
}
