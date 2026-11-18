import { WebSocketGateway, WebSocketServer, OnGatewayConnection } from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { TokenBlacklistService } from '../auth/token-blacklist.service';

@WebSocketGateway({ namespace: '/billing', cors: { origin: true, credentials: true } })
export class BillingGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;
  constructor(private readonly jwt: JwtService, private readonly blacklist: TokenBlacklistService) {}
  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token;
      if (!token || this.blacklist.isBlacklisted(token)) throw new Error('Invalid session');
      const payload = this.jwt.verify(token);
      if (!payload.sub) throw new Error('Missing account');
      await client.join('billing:user:' + payload.sub);
      if (['super_admin', 'admin'].includes(payload.role)) await client.join('billing:admins');
    } catch { client.disconnect(true); }
  }
  changed(userId: string, paymentId: string) {
    this.server?.to('billing:user:' + userId).to('billing:admins').emit('billingChanged', { paymentId });
  }
}
