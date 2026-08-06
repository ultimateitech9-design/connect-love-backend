import { MigrationInterface, QueryRunner } from 'typeorm';

export class UniqueFirstImpressionPair1786072000000 implements MigrationInterface {
  name = 'UniqueFirstImpressionPair1786072000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE duplicate FROM first_impressions duplicate
      INNER JOIN first_impressions original
        ON duplicate.senderId = original.senderId
        AND duplicate.receiverId = original.receiverId
        AND (duplicate.createdAt > original.createdAt OR (duplicate.createdAt = original.createdAt AND duplicate.id > original.id))`);
    await queryRunner.query('CREATE UNIQUE INDEX UQ_first_impressions_sender_receiver ON first_impressions (senderId, receiverId)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX UQ_first_impressions_sender_receiver ON first_impressions');
  }
}
