import { MigrationInterface, QueryRunner } from 'typeorm';

export class VoiceMessageContent1780574000000 implements MigrationInterface {
  name = 'VoiceMessageContent1780574000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE messages MODIFY content MEDIUMTEXT NOT NULL');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE messages MODIFY content TEXT NOT NULL');
  }
}
