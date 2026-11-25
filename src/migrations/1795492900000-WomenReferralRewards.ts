import { MigrationInterface, QueryRunner } from 'typeorm';

export class WomenReferralRewards1795492900000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query("ALTER TABLE coin_transactions ADD COLUMN walletSource varchar(16) NOT NULL DEFAULT 'coins'");
    await q.query(`CREATE TABLE referral_codes (userId varchar(36) PRIMARY KEY, code varchar(24) NOT NULL UNIQUE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await q.query(`CREATE TABLE referrals (id varchar(36) PRIMARY KEY, referrerId varchar(36) NOT NULL, referredId varchar(36) NOT NULL UNIQUE, qualifiedAt datetime NULL,
      createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), KEY IDX_referral_inviter (referrerId)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await q.query(`CREATE TABLE referral_activity (referralId varchar(36) NOT NULL, activeDate varchar(10) NOT NULL, PRIMARY KEY(referralId, activeDate)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await q.query(`CREATE TABLE referral_rewards (id varchar(36) PRIMARY KEY, referralId varchar(36) NOT NULL, userId varchar(36) NOT NULL, kind varchar(16) NOT NULL,
      amountPaise int unsigned NOT NULL, unlockAt datetime NOT NULL, withdrawalId varchar(36) NULL, createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      UNIQUE KEY UQ_referral_reward (referralId, userId, kind), KEY IDX_referral_wallet (userId, withdrawalId, unlockAt)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  }
  async down(q: QueryRunner): Promise<void> {
    for (const table of ['referral_rewards', 'referral_activity', 'referrals', 'referral_codes']) await q.query(`DROP TABLE ${table}`);
    await q.query('ALTER TABLE coin_transactions DROP COLUMN walletSource');
  }
}
