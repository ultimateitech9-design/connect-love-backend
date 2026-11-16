import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Agent } from '../agents/agent.entity';
import { User } from '../users/user.entity';
import { AuditLog } from '../platform/audit-log.entity';

@Injectable()
export class AdminAccountsService {
  constructor(private readonly db: DataSource) {}
  private paging(pageValue?: string, limitValue?: string) {
    return { page: Math.max(1, parseInt(pageValue || '1', 10) || 1), limit: Math.min(100, Math.max(1, parseInt(limitValue || '25', 10) || 25)) };
  }
  async agents(search = '', pageValue?: string, limitValue?: string) {
    const { page, limit } = this.paging(pageValue, limitValue);
    const term = `%${search.trim()}%`;
    const where = "a.status <> 'deleted' AND (a.name LIKE ? OR a.email LIKE ? OR a.id LIKE ?)";
    const [agents, count] = await Promise.all([
      this.db.query(`SELECT a.id, a.name, a.email, a.status, a.createdAt, COUNT(u.id) AS userCount,
        COALESCE(SUM(u.status = 'active'),0) AS activeUserCount
        FROM agents a LEFT JOIN users u ON u.createdByAgentId = a.id
        WHERE ${where} GROUP BY a.id,a.name,a.email,a.status,a.createdAt
        ORDER BY a.createdAt DESC,a.id DESC LIMIT ? OFFSET ?`, [term, term, term, limit, (page - 1) * limit]),
      this.db.query(`SELECT COUNT(*) AS total FROM agents a WHERE ${where}`, [term, term, term]),
    ]);
    const total = Number(count[0].total);
    return { agents: agents.map((a: any) => ({ ...a, userCount: Number(a.userCount), activeUserCount: Number(a.activeUserCount) })), total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) };
  }
  async accounts(search = '', status = 'all', pageValue?: string, limitValue?: string) {
    const { page, limit } = this.paging(pageValue, limitValue);
    const union = `(SELECT id,name,email,role,status,createdAt,'user' AS accountType FROM users
      UNION ALL SELECT id,name,email,'agent' AS role,status,createdAt,'agent' AS accountType FROM agents WHERE status <> 'deleted') accounts`;
    const where = `(name LIKE ? OR email LIKE ? OR id LIKE ?)${status === 'active' ? " AND status = 'active'" : ''}`;
    const term = `%${search.trim()}%`;
    const [accounts, count] = await Promise.all([
      this.db.query(`SELECT * FROM ${union} WHERE ${where} ORDER BY createdAt DESC,id DESC,accountType LIMIT ? OFFSET ?`, [term, term, term, limit, (page - 1) * limit]),
      this.db.query(`SELECT COUNT(*) AS total FROM ${union} WHERE ${where}`, [term, term, term]),
    ]);
    const total = Number(count[0].total);
    return { accounts, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) };
  }

  async agentDetails(id: string, pageValue?: string, limitValue?: string) {
    const { page, limit } = this.paging(pageValue, limitValue);
    const agent = await this.db.getRepository(Agent).findOne({ where: { id }, select: ['id', 'name', 'email', 'status', 'createdAt'] });
    if (!agent || agent.status === 'deleted') throw new NotFoundException('Agent account was not found.');
    const repo = this.db.getRepository(User);
    const [users, userCount, activeUserCount, bannedUserCount] = await Promise.all([
      repo.find({ where: { createdByAgentId: id }, select: ['id', 'name', 'email', 'phone', 'city', 'status', 'role', 'createdAt'], order: { createdAt: 'DESC', id: 'DESC' }, skip: (page - 1) * limit, take: limit }),
      repo.countBy({ createdByAgentId: id }), repo.countBy({ createdByAgentId: id, status: 'active' }), repo.countBy({ createdByAgentId: id, status: 'banned' }),
    ]);
    return { agent: { ...agent, userCount, activeUserCount, bannedUserCount }, users, total: userCount, page, limit, pages: Math.max(1, Math.ceil(userCount / limit)) };
  }

  async manageAgent(id: string, action: 'active' | 'banned' | 'deleted', actorId: string) {
    await this.db.transaction(async manager => {
      const repo = manager.getRepository(Agent);
      const agent = await repo.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!agent || agent.status === 'deleted') throw new NotFoundException('Agent account was not found.');
      if (agent.status === action) return;
      agent.status = action;
      agent.sessionVersion += 1;
      if (action === 'deleted') agent.deletedAt = new Date();
      await repo.save(agent);
      // Retain the creator reference for existing user accounts and audit history.
      await manager.save(AuditLog, manager.create(AuditLog, {
        userId: actorId, user: 'Super Admin', role: 'super_admin', module: 'Agent Management',
        action: action === 'deleted' ? 'Delete' : action === 'banned' ? 'Ban' : 'Unban',
        activity: `Agent ${id} ${action === 'deleted' ? 'deleted' : action === 'banned' ? 'banned' : 'reactivated'} by ${actorId}`,
      }));
    });
    return { success: true, message: action === 'deleted' ? 'Agent account deleted. Created user accounts are preserved.' : action === 'banned' ? 'Agent banned. Dashboard access has been revoked.' : 'Agent unbanned. They can sign in again.' };
  }
}
