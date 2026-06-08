import { Injectable } from '@nestjs/common';

/**
 * In-memory JWT blacklist.
 *
 * When a user logs out (or when the browser fires beforeunload and hits /auth/logout),
 * the token's JTI (or the raw token string) is stored here.
 *
 * JwtStrategy.validate() checks against this blacklist before allowing a request.
 *
 * NOTE: This is an in-memory store. Tokens are cleared when the server restarts.
 * For production, replace with a Redis-backed store with TTL matching JWT_EXPIRES_IN.
 */
@Injectable()
export class TokenBlacklistService {
  private readonly blacklisted = new Set<string>();

  /** Add a token (or its JTI) to the blacklist. */
  blacklist(token: string): void {
    this.blacklisted.add(token);
  }

  /** Returns true if the token is blacklisted (logged out). */
  isBlacklisted(token: string): boolean {
    return this.blacklisted.has(token);
  }
}
