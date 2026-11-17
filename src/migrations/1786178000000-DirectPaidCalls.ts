import { MigrationInterface, QueryRunner } from 'typeorm';

// Paid direct calls between users who have not matched (see src/direct-calls).
export class DirectPaidCalls1786178000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // Direct calls have no match/conversation.
    await queryRunner.query('ALTER TABLE video_calls MODIFY conversationId varchar(36) NULL');
    await queryRunner.query(`ALTER TABLE video_calls
      ADD COLUMN mode enum('match','direct') NOT NULL DEFAULT 'match' AFTER callType,
      ADD COLUMN isFreeTrial tinyint(1) NOT NULL DEFAULT 0 AFTER mode,
      ADD COLUMN ratePerMinute int unsigned NULL AFTER isFreeTrial,
      ADD COLUMN billedMinutes int unsigned NOT NULL DEFAULT 0 AFTER ratePerMinute,
      ADD COLUMN coinsCharged int unsigned NOT NULL DEFAULT 0 AFTER billedMinutes,
      ADD COLUMN endReason varchar(30) NULL AFTER coinsCharged`);
    await queryRunner.query('CREATE INDEX IDX_video_calls_caller_mode_created ON video_calls (callerId, mode, createdAt)');

    await queryRunner.query('ALTER TABLE users ADD COLUMN allowDirectCalls tinyint(1) NOT NULL DEFAULT 1 AFTER earnedCoinBalance');
    await queryRunner.query('ALTER TABLE agents ADD COLUMN earnedCoinBalance int unsigned NOT NULL DEFAULT 0 AFTER status');

    await queryRunner.query(`ALTER TABLE coin_transactions
      ADD COLUMN agentId char(36) NULL AFTER receiverId,
      ADD COLUMN agentCoins int unsigned NOT NULL DEFAULT 0 AFTER platformCoins,
      ADD COLUMN callId char(36) NULL AFTER agentId`);
    await queryRunner.query('CREATE INDEX IDX_coin_transactions_call ON coin_transactions (callId)');
    await queryRunner.query('CREATE INDEX IDX_coin_transactions_agent ON coin_transactions (agentId)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IDX_coin_transactions_agent ON coin_transactions');
    await queryRunner.query('DROP INDEX IDX_coin_transactions_call ON coin_transactions');
    await queryRunner.query('ALTER TABLE coin_transactions DROP COLUMN callId, DROP COLUMN agentCoins, DROP COLUMN agentId');
    await queryRunner.query('ALTER TABLE agents DROP COLUMN earnedCoinBalance');
    await queryRunner.query('ALTER TABLE users DROP COLUMN allowDirectCalls');
    await queryRunner.query('DROP INDEX IDX_video_calls_caller_mode_created ON video_calls');
    await queryRunner.query('ALTER TABLE video_calls DROP COLUMN endReason, DROP COLUMN coinsCharged, DROP COLUMN billedMinutes, DROP COLUMN ratePerMinute, DROP COLUMN isFreeTrial, DROP COLUMN mode');
    await queryRunner.query("DELETE FROM video_calls WHERE conversationId IS NULL");
    await queryRunner.query('ALTER TABLE video_calls MODIFY conversationId varchar(36) NOT NULL');
  }
}
