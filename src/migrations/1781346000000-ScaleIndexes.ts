import { MigrationInterface, QueryRunner } from 'typeorm';

export class ScaleIndexes1781346000000 implements MigrationInterface {
  name = 'ScaleIndexes1781346000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE INDEX IDX_users_discovery ON users (status, role, birthDate, createdAt)');
    await queryRunner.query('CREATE INDEX IDX_users_city_religion ON users (city, religion)');
    await queryRunner.query('CREATE INDEX IDX_matches_sender_status ON matches (senderId, status, createdAt)');
    await queryRunner.query('CREATE INDEX IDX_matches_receiver_status ON matches (receiverId, status, createdAt)');
    await queryRunner.query('CREATE INDEX IDX_messages_conversation_created ON messages (conversationId, createdAt)');
    await queryRunner.query('CREATE INDEX IDX_messages_unread ON messages (conversationId, receiverId, isRead)');
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    for (const [table, index] of [['messages','IDX_messages_unread'],['messages','IDX_messages_conversation_created'],['matches','IDX_matches_receiver_status'],['matches','IDX_matches_sender_status'],['users','IDX_users_city_religion'],['users','IDX_users_discovery']]) {
      await queryRunner.query(`DROP INDEX ${index} ON ${table}`);
    }
  }
}

