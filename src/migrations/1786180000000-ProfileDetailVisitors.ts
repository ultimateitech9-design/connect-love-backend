import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProfileDetailVisitors1786180000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query('ALTER TABLE profile_views ADD COLUMN detailViewedAt datetime(6) NULL');
    await runner.query('CREATE INDEX IDX_profile_views_detail_visitors ON profile_views (profileUserId, detailViewedAt, viewerUserId)');
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.query('DROP INDEX IDX_profile_views_detail_visitors ON profile_views');
    await runner.query('ALTER TABLE profile_views DROP COLUMN detailViewedAt');
  }
}
