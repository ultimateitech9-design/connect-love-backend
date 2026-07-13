"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "SearchService", {
    enumerable: true,
    get: function() {
        return SearchService;
    }
});
const _common = require("@nestjs/common");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let SearchService = class SearchService {
    get enabled() {
        return Boolean(this.endpoint);
    }
    async searchUserIds(term, filters) {
        if (!this.enabled) return null;
        const auth = process.env.SEARCH_USERNAME ? `Basic ${Buffer.from(`${process.env.SEARCH_USERNAME}:${process.env.SEARCH_PASSWORD || ''}`).toString('base64')}` : undefined;
        const body = {
            from: filters.offset,
            size: filters.limit,
            _source: false,
            query: {
                bool: {
                    must: [
                        {
                            multi_match: {
                                query: term,
                                fields: [
                                    'name^4',
                                    'city^2',
                                    'profession',
                                    'religion',
                                    'interests'
                                ],
                                fuzziness: 'AUTO'
                            }
                        }
                    ],
                    filter: [
                        {
                            term: {
                                status: 'active'
                            }
                        },
                        {
                            term: {
                                role: 'user'
                            }
                        },
                        {
                            range: {
                                age: {
                                    gte: filters.ageMin,
                                    lte: filters.ageMax
                                }
                            }
                        }
                    ]
                }
            }
        };
        try {
            const response = await fetch(`${this.endpoint}/${encodeURIComponent(this.index)}/_search`, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    ...auth ? {
                        authorization: auth
                    } : {}
                },
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(Number(process.env.SEARCH_TIMEOUT_MS || 1500))
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const result = await response.json();
            return result.hits?.hits?.map((hit)=>hit._id) || [];
        } catch (error) {
            this.logger.warn(`Search cluster unavailable; using SQL fallback: ${error.message}`);
            return null;
        }
    }
    constructor(){
        this.logger = new _common.Logger(SearchService.name);
        this.endpoint = (process.env.SEARCH_URL || '').replace(/\/$/, '');
        this.index = process.env.SEARCH_USERS_INDEX || 'connect-love-users';
    }
};
SearchService = _ts_decorate([
    (0, _common.Injectable)()
], SearchService);

//# sourceMappingURL=search.service.js.map