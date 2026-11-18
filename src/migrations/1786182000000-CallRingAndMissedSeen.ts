import { MigrationInterface, QueryRunner } from 'typeorm';

// ringsReceiver: false when the receiver was offline at call time, so the call
// never rings later. users.callsSeenAt: when missed calls were last looked at.
export class CallRingAndMissedSeen1786182000000 implements MigrationInterface {
  name = 'CallRingAndMissedSeen1786182000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('video_calls', 'ringsReceiver'))) {
      await queryRunner.query('ALTER TABLE video_calls ADD ringsReceiver tinyint NOT NULL DEFAULT 1');
    }
    if (!(await queryRunner.hasColumn('users', 'callsSeenAt'))) {
      await queryRunner.query('ALTER TABLE users ADD callsSeenAt datetime NULL');
    }
  }
  async down(): Promise<void> { /* Keep call history. */ }
}
