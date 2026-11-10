import { createHmac } from 'crypto';
import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

type IceServer = { urls: string[]; username?: string; credential?: string };

// How long issued TURN credentials stay valid. Long enough for a call to be
// set up and run; the client fetches fresh ones before every call.
const CREDENTIAL_TTL_SECONDS = 12 * 60 * 60;

function urlList(value: string | undefined) {
  return (value ?? '')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean);
}

@UseGuards(AuthGuard('jwt'))
@Controller('webrtc')
export class WebrtcController {
  /**
   * GET /webrtc/ice-servers
   *
   * Returns STUN/TURN servers for a call. TURN credentials follow the coturn
   * "TURN REST API" scheme (use-auth-secret): username is
   * "<expiry unix time>:<user id>" and the password is
   * base64(HMAC-SHA1(TURN_SECRET, username)), so coturn can verify them
   * without a user database and they expire on their own.
   */
  @Get('ice-servers')
  iceServers(@Request() req: any): { iceServers: IceServer[]; ttl: number } {
    const iceServers: IceServer[] = [];

    const stunUrls = urlList(process.env.STUN_URLS);
    if (stunUrls.length) iceServers.push({ urls: stunUrls });

    const turnUrls = urlList(process.env.TURN_URLS);
    const secret = process.env.TURN_SECRET?.trim();
    if (turnUrls.length && secret) {
      const expiresAt = Math.floor(Date.now() / 1000) + CREDENTIAL_TTL_SECONDS;
      const username = `${expiresAt}:${req.user.userId}`;
      const credential = createHmac('sha1', secret).update(username).digest('base64');
      iceServers.push({ urls: turnUrls, username, credential });
    }

    return { iceServers, ttl: CREDENTIAL_TTL_SECONDS };
  }
}
