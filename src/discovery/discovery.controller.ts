import { Controller, Get, UseGuards, Request, Query, Param } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DiscoveryService } from './discovery.service';

@Controller('discovery')
@UseGuards(AuthGuard('jwt'))
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Get('search')
  async searchProfiles(@Request() req: any, @Query() query: Record<string, string>) {
    if (!query.search?.trim()) return { items: [], hasMore: false, nextCursor: null };
    return this.discoveryService.getSuggestions(req.user.userId, {
      nameSearch: true, queue: true, compact: query.compact === 'true', search: query.search, cursor: query.cursor,
      limit: Number(query.limit) || 12,
      ageMin: Number(query.ageMin) || undefined, ageMax: Number(query.ageMax) || undefined,
      interestedIn: query.interestedIn, maxDistance: Number(query.maxDistance) || undefined,
      verifiedOnly: query.verifiedOnly === 'true',
      interests: query.interests?.split(',').filter(Boolean).slice(0, 30),
    });
  }

  @Get('search/thumbnail/:id')
  searchThumbnail(@Request() req: any, @Param('id') id: string) {
    return this.discoveryService.searchThumbnail(req.user.userId, id);
  }

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
    @Query('cursor') cursor?: string,
    @Query('queue') queue?: string,
    @Query('interests') interests?: string,
    @Query('verifiedOnly') verifiedOnly?: string,
  ) {
    return this.discoveryService.getSuggestions(req.user.userId, {
      cursor,
      queue: queue === 'true',
      interests: interests?.split(',').map(value => value.trim()).filter(Boolean).slice(0, 30),
      verifiedOnly: verifiedOnly === 'true',
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
