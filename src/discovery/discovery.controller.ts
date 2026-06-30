import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DiscoveryService } from './discovery.service';

@Controller('discovery')
@UseGuards(AuthGuard('jwt'))
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Get()
  async getSuggestions(@Request() req: any, @Query('search') search?: string) {
    return this.discoveryService.getSuggestions(req.user.userId, search);
  }

  @Get('tags')
  async getTags() {
    return this.discoveryService.getPopularTags();
  }
}
