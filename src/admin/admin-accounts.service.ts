import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class AdminAccountsService {
  constructor(private readonly db: DataSource) {}
  private paging(pageValue?: string, limitValue?: string) {
    return { page: Math.max(1, parseInt(pageValue || '1', 10) || 1), limit: Math.min(100, Math.max(1, parseInt(limitValue || '25', 10) || 25)) };
  }
  async agents(search = '', pageValue?: string, limitValue?: string) {
    const { page, limit } = this.paging(pageValue, limitValue);
    const term = `%${search.trim()}%`;
    const where = '(a.name LIKE ? OR a.email LIKE ? OR a.id LIKE ?)';
    const [agents, count] = await Promise.all([
      this.db.query(`SELECT a.id, a.name, a.email, a.createdAt, COUNT(u.id) AS userCount,
        COALESCE(SUM(u.status = 'active'),0) AS activeUserCount
        FROM agents a LEFT JOIN users u ON u.createdByAgentId = a.id
        WHERE ${where} GROUP BY a.id,a.name,a.email,a.createdAt
        ORDER BY a.createdAt DESC,a.id DESC LIMIT ? OFFSET ?`, [term, term, term, limit, (page - 1) * limit]),
      this.db.query(`SELECT COUNT(*) AS total FROM agents a WHERE ${where}`, [term, term, term]),
    ]);
    const total = Number(count[0].total);
    return { agents: agents.map((a: any) => ({ ...a, userCount: Number(a.userCount), activeUserCount: Number(a.activeUserCount) })), total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) };
  }
  async accounts(search = '', status = 'all', pageValue?: string, limitValue?: string) {
    const { page, limit } = this.paging(pageValue, limitValue);
    const union = `(SELECT id,name,email,role,status,createdAt,'user' AS accountType FROM users
      UNION ALL SELECT id,name,email,'agent' AS role,'active' AS status,createdAt,'agent' AS accountType FROM agents) accounts`;
    const where = `(name LIKE ? OR email LIKE ? OR id LIKE ?)${status === 'active' ? " AND status = 'active'" : ''}`;
    const term = `%${search.trim()}%`;
    const [accounts, count] = await Promise.all([
      this.db.query(`SELECT * FROM ${union} WHERE ${where} ORDER BY createdAt DESC,id DESC,accountType LIMIT ? OFFSET ?`, [term, term, term, limit, (page - 1) * limit]),
      this.db.query(`SELECT COUNT(*) AS total FROM ${union} WHERE ${where}`, [term, term, term]),
    ]);
    const total = Number(count[0].total);
    return { accounts, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) };
  }
}
