import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { VerifyKycDto } from './dto/verify-kyc.dto';
import { KycService } from './kyc.service';

@Controller('kyc')
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('verify')
  verify(@Request() req: any, @Body() dto: VerifyKycDto) {
    return this.kycService.verify(req.user.userId, dto.liveFrames);
  }
}
