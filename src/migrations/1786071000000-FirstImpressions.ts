import { MigrationInterface, QueryRunner } from 'typeorm';

export class FirstImpressions1786071000000 implements MigrationInterface {
  name = 'FirstImpressions1786071000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE first_impressions (
      id varchar(36) NOT NULL,
      senderId varchar(36) NOT NULL,
      receiverId varchar(36) NOT NULL,
      content text NOT NULL,
      isRead tinyint NOT NULL DEFAULT 0,
      createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      PRIMARY KEY (id),
      INDEX IDX_first_impressions_sender_created (senderId, createdAt),
      INDEX IDX_first_impressions_receiver_created (receiverId, createdAt),
      CONSTRAINT FK_first_impressions_sender FOREIGN KEY (senderId) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT FK_first_impressions_receiver FOREIGN KEY (receiverId) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS first_impressions');
  }
}
