import { Injectable, Logger } from '@nestjs/common';

type SearchFilters = { ageMin: number; ageMax: number; limit: number; offset: number };

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly endpoint = (process.env.SEARCH_URL || '').replace(/\/$/, '');
  private readonly index = process.env.SEARCH_USERS_INDEX || 'connect-love-users';

  get enabled(): boolean { return Boolean(this.endpoint); }

  async searchUserIds(term: string, filters: SearchFilters): Promise<string[] | null> {
    if (!this.enabled) return null;
    const auth = process.env.SEARCH_USERNAME
      ? `Basic ${Buffer.from(`${process.env.SEARCH_USERNAME}:${process.env.SEARCH_PASSWORD || ''}`).toString('base64')}`
      : undefined;
    const body = {
      from: filters.offset,
      size: filters.limit,
      _source: false,
      query: {
        bool: {
          must: [{ multi_match: { query: term, fields: ['name^4', 'city^2', 'profession', 'religion', 'interests'], fuzziness: 'AUTO' } }],
          filter: [
            { term: { status: 'active' } },
            { term: { role: 'user' } },
            { range: { age: { gte: filters.ageMin, lte: filters.ageMax } } },
          ],
        },
      },
    };
    try {
      const response = await fetch(`${this.endpoint}/${encodeURIComponent(this.index)}/_search`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(auth ? { authorization: auth } : {}) },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(Number(process.env.SEARCH_TIMEOUT_MS || 1500)),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json() as { hits?: { hits?: Array<{ _id: string }> } };
      return result.hits?.hits?.map((hit) => hit._id) || [];
    } catch (error) {
      this.logger.warn(`Search cluster unavailable; using SQL fallback: ${(error as Error).message}`);
      return null;
    }
  }
}

