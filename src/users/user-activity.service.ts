import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class UserActivityService {
  constructor(private readonly db: DataSource) {}

  async get(userId: string, requestedPage = 1) {
    const page = Number.isFinite(requestedPage) ? Math.max(1, Math.trunc(requestedPage)) : 1;
    const limit = 25;
    // Ringing, rejected and missed calls are attempts, never conversation time.
    const duration = `CASE WHEN c.status = 'ended' AND c.startedAt IS NOT NULL AND c.endedAt IS NOT NULL
      THEN GREATEST(0, TIMESTAMPDIFF(SECOND, c.startedAt, c.endedAt)) ELSE 0 END`;
    const peer = 'CASE WHEN c.callerId = ? THEN c.receiverId ELSE c.callerId END';
    const [friends, friendCount, summary, contacts, calls] = await Promise.all([
      this.db.query(`SELECT p.id, p.name, p.city, MAX(m.updatedAt) AS connectedAt FROM matches m
        JOIN users p ON p.id = CASE WHEN m.senderId = ? THEN m.receiverId ELSE m.senderId END
        WHERE (m.senderId = ? OR m.receiverId = ?) AND m.status = 'MATCHED'
        GROUP BY p.id, p.name, p.city ORDER BY connectedAt DESC LIMIT 100`, [userId, userId, userId]),
      this.db.query(`SELECT COUNT(DISTINCT CASE WHEN senderId = ? THEN receiverId ELSE senderId END) AS total
        FROM matches WHERE (senderId = ? OR receiverId = ?) AND status = 'MATCHED'`, [userId, userId, userId]),
      this.db.query(`SELECT COUNT(*) AS totalCalls,
        SUM(CASE WHEN c.callType = 'audio' THEN 1 ELSE 0 END) AS audioCalls,
        SUM(CASE WHEN c.callType = 'video' THEN 1 ELSE 0 END) AS videoCalls,
        SUM(CASE WHEN c.callType = 'audio' THEN ${duration} ELSE 0 END) AS audioSeconds,
        SUM(CASE WHEN c.callType = 'video' THEN ${duration} ELSE 0 END) AS videoSeconds
        FROM video_calls c WHERE c.callerId = ? OR c.receiverId = ?`, [userId, userId]),
      this.db.query(`SELECT p.id, p.name, COUNT(*) AS totalCalls,
        SUM(CASE WHEN c.callType = 'audio' THEN 1 ELSE 0 END) AS audioCalls,
        SUM(CASE WHEN c.callType = 'video' THEN 1 ELSE 0 END) AS videoCalls,
        SUM(CASE WHEN c.callType = 'audio' THEN ${duration} ELSE 0 END) AS audioSeconds,
        SUM(CASE WHEN c.callType = 'video' THEN ${duration} ELSE 0 END) AS videoSeconds,
        MAX(c.createdAt) AS lastCallAt FROM video_calls c JOIN users p ON p.id = ${peer}
        WHERE c.callerId = ? OR c.receiverId = ? GROUP BY p.id,p.name ORDER BY lastCallAt DESC LIMIT 100`, [userId, userId, userId]),
      this.db.query(`SELECT c.id, c.callType, c.status, c.startedAt, c.endedAt, c.createdAt,
        ${duration} AS durationSeconds, p.id AS peerId, p.name AS peerName,
        CASE WHEN c.callerId = ? THEN 'outgoing' ELSE 'incoming' END AS direction
        FROM video_calls c JOIN users p ON p.id = ${peer}
        WHERE c.callerId = ? OR c.receiverId = ? ORDER BY c.createdAt DESC, c.id DESC LIMIT ? OFFSET ?`,
      [userId, userId, userId, userId, limit, (page - 1) * limit]),
    ]);
    const numbers = (row: any) => Object.fromEntries(Object.entries(row).map(([key, value]) =>
      ['totalCalls', 'audioCalls', 'videoCalls', 'audioSeconds', 'videoSeconds', 'durationSeconds'].includes(key)
        ? [key, Number(value) || 0] : [key, value]));
    const totals = numbers(summary[0]);
    return {
      friendCount: Number(friendCount[0].total), friends, friendsLimit: 100,
      summary: totals, contacts: contacts.map(numbers), contactsLimit: 100,
      calls: calls.map(numbers), page, limit, totalCalls: totals.totalCalls,
      pages: Math.max(1, Math.ceil(Number(totals.totalCalls) / limit)),
    };
  }
}
