import { MigrationInterface, QueryRunner } from 'typeorm';

export class MessageActions1781344000000 implements MigrationInterface {
  name = 'MessageActions1781344000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE messages ADD deletedForUserIds TEXT NULL');
    await queryRunner.query('ALTER TABLE messages ADD deletedForEveryone TINYINT NOT NULL DEFAULT 0');
    await queryRunner.query('ALTER TABLE messages ADD pinnedByUserIds TEXT NULL');
    await queryRunner.query('ALTER TABLE messages ADD starredByUserIds TEXT NULL');
    await queryRunner.query('ALTER TABLE messages ADD replyToMessageId varchar(36) NULL');
    await queryRunner.query('ALTER TABLE messages ADD editedAt datetime NULL');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE messages DROP COLUMN editedAt');
    await queryRunner.query('ALTER TABLE messages DROP COLUMN replyToMessageId');
    await queryRunner.query('ALTER TABLE messages DROP COLUMN starredByUserIds');
    await queryRunner.query('ALTER TABLE messages DROP COLUMN pinnedByUserIds');
    await queryRunner.query('ALTER TABLE messages DROP COLUMN deletedForEveryone');
    await queryRunner.query('ALTER TABLE messages DROP COLUMN deletedForUserIds');
  }
}
