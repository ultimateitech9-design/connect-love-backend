"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "CoinWalletLedger1785080000000", {
    enumerable: true,
    get: function() {
        return CoinWalletLedger1785080000000;
    }
});
let CoinWalletLedger1785080000000 = class CoinWalletLedger1785080000000 {
    async up(queryRunner) {
        await queryRunner.query('ALTER TABLE users ADD earnedCoinBalance INT UNSIGNED NOT NULL DEFAULT 0 AFTER coinBalance');
        await queryRunner.query(`CREATE TABLE coin_transactions (
      id char(36) NOT NULL,
      type varchar(20) NOT NULL,
      status varchar(20) NOT NULL DEFAULT 'completed',
      userId char(36) NULL,
      senderId char(36) NULL,
      receiverId char(36) NULL,
      grossCoins int UNSIGNED NOT NULL,
      userCoins int UNSIGNED NOT NULL DEFAULT 0,
      platformCoins int UNSIGNED NOT NULL DEFAULT 0,
      label varchar(120) NULL,
      payoutAccount varchar(160) NULL,
      createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      PRIMARY KEY (id),
      INDEX IDX_coin_transactions_user (userId),
      INDEX IDX_coin_transactions_sender (senderId),
      INDEX IDX_coin_transactions_receiver (receiverId),
      INDEX IDX_coin_transactions_created (createdAt)
    ) ENGINE=InnoDB`);
    }
    async down(queryRunner) {
        await queryRunner.query('DROP TABLE coin_transactions');
        await queryRunner.query('ALTER TABLE users DROP COLUMN earnedCoinBalance');
    }
    constructor(){
        this.name = 'CoinWalletLedger1785080000000';
    }
};

//# sourceMappingURL=1785080000000-CoinWalletLedger.js.map