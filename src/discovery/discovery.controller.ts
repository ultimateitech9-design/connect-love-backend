import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DiscoveryService } from './discovery.service';

@Controller('discovery')
@UseGuards(AuthGuard('jwt'))
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Get()
  async getSuggestions(
    @Request() req: any,
    @Query('search') search?: string,
    @Query('ageMin') ageMin?: string,
    @Query('ageMax') ageMax?: string,
  ) {
    return this.discoveryService.getSuggestions(req.user.userId, {
      search,
      ageMin: ageMin ? Number(ageMin) : undefined,
      ageMax: ageMax ? Number(ageMax) : undefined,
    });
  }

  @Get('tags')
  async getTags() {
    return this.discoveryService.getPopularTags();
  }
}
