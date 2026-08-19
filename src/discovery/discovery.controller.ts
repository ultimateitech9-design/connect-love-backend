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
    @Query('interestedIn') interestedIn?: string,
    @Query('goals') goals?: string,
    @Query('maxDistance') maxDistance?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('excludeIds') excludeIds?: string,
  ) {
    return this.discoveryService.getSuggestions(req.user.userId, {
      search,
      ageMin: ageMin ? Number(ageMin) : undefined,
      ageMax: ageMax ? Number(ageMax) : undefined,
      interestedIn,
      goals: goals ? goals.split(',').map((goal) => goal.trim()).filter(Boolean) : undefined,
      maxDistance: maxDistance ? Number(maxDistance) : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      excludeIds: excludeIds ? excludeIds.split(',').map((id) => id.trim()).filter(Boolean).slice(0, 24) : undefined,
    });
  }

  @Get('tags')
  async getTags() {
    return this.discoveryService.getPopularTags();
  }
}
