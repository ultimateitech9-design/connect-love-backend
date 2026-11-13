import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from './agent.entity';

export function agentSecret() {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) throw new Error('JWT_SECRET must be configured');
  return `${secret}:connectlove-agent`;
}

@Injectable()
export class AgentGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, @InjectRepository(Agent) private readonly agents: Repository<Agent>) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    try {
      const token = request.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
      if (!token) throw new Error();
      const payload = await this.jwt.verifyAsync(token, { secret: agentSecret(), audience: 'agent' });
      const agent = await this.agents.findOneBy({ id: payload.sub });
      if (!agent || payload.version !== agent.sessionVersion) throw new Error();
      request.agent = agent;
      return true;
    } catch { throw new UnauthorizedException('Please sign in to your agent account.'); }
  }
}
