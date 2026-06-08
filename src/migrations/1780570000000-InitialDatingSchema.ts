import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialDatingSchema1780570000000 implements MigrationInterface {
  name = 'InitialDatingSchema1780570000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE users (
        id varchar(36) NOT NULL,
        name varchar(150) NOT NULL,
        email varchar(255) NOT NULL,
        password varchar(255) NOT NULL,
        birthDate date NULL,
        gender varchar(30) NULL,
        profession varchar(150) NULL,
        height varchar(20) NULL,
        city varchar(150) NULL,
        interests json NULL,
        personalityWords json NULL,
        bio varchar(500) NULL,
        photos json NULL,
        hobbies json NULL,
        plan enum('free','gold','platinum') NOT NULL DEFAULT 'free',
        status enum('active','suspended','banned','pending_verification') NOT NULL DEFAULT 'active',
        role enum('user','admin','super_admin','marketing','finance','sales','support') NOT NULL DEFAULT 'user',
        isVerified tinyint NOT NULL DEFAULT 0,
        onboardingCompleted tinyint NOT NULL DEFAULT 0,
        isOnline tinyint NOT NULL DEFAULT 0,
        lastSeen timestamp NULL,
        showOnlineStatus tinyint NOT NULL DEFAULT 1,
        showDistance tinyint NOT NULL DEFAULT 1,
        photosVisibleToNonMatches tinyint NOT NULL DEFAULT 0,
        onlyShowVerifiedProfiles tinyint NOT NULL DEFAULT 0,
        notifyMessages tinyint NOT NULL DEFAULT 1,
        notifyMatches tinyint NOT NULL DEFAULT 1,
        notifyPush tinyint NOT NULL DEFAULT 1,
        darkMode tinyint NOT NULL DEFAULT 0,
        language varchar(10) NOT NULL DEFAULT 'en',
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX IDX_users_email (email),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE matches (
        id varchar(36) NOT NULL,
        senderId varchar(36) NOT NULL,
        receiverId varchar(36) NOT NULL,
        status enum('PENDING','MATCHED','DECLINED','BLOCKED') NOT NULL DEFAULT 'PENDING',
        isSuperLike tinyint NOT NULL DEFAULT 0,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX IDX_matches_sender (senderId),
        INDEX IDX_matches_receiver (receiverId),
        INDEX IDX_matches_status (status),
        PRIMARY KEY (id),
        CONSTRAINT FK_matches_sender FOREIGN KEY (senderId) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT FK_matches_receiver FOREIGN KEY (receiverId) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE messages (
        id varchar(36) NOT NULL,
        conversationId varchar(36) NOT NULL,
        senderId varchar(36) NOT NULL,
        receiverId varchar(36) NOT NULL,
        content text NOT NULL,
        isRead tinyint NOT NULL DEFAULT 0,
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX IDX_messages_conversation (conversationId),
        INDEX IDX_messages_receiver_read (receiverId, isRead),
        PRIMARY KEY (id),
        CONSTRAINT FK_messages_conversation FOREIGN KEY (conversationId) REFERENCES matches(id) ON DELETE CASCADE,
        CONSTRAINT FK_messages_sender FOREIGN KEY (senderId) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT FK_messages_receiver FOREIGN KEY (receiverId) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE contacts (
        id int NOT NULL AUTO_INCREMENT,
        name varchar(150) NOT NULL,
        email varchar(255) NOT NULL,
        subject varchar(255) NOT NULL,
        message text NOT NULL,
        status varchar(30) NOT NULL DEFAULT 'open',
        createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS messages');
    await queryRunner.query('DROP TABLE IF EXISTS matches');
    await queryRunner.query('DROP TABLE IF EXISTS contacts');
    await queryRunner.query('DROP TABLE IF EXISTS users');
  }
}
