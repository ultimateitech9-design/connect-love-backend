import { MigrationInterface, QueryRunner } from 'typeorm';

export class VideoCallType1782180000000 implements MigrationInterface {
  name = 'VideoCallType1782180000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE `video_calls` ADD `callType` enum ('audio', 'video') NOT NULL DEFAULT 'video'",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `video_calls` DROP COLUMN `callType`');
  }
}
