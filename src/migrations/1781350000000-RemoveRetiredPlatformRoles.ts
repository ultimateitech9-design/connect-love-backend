import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveRetiredPlatformRoles1781350000000 implements MigrationInterface {
  name = 'RemoveRetiredPlatformRoles1781350000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM platform_roles
      WHERE LOWER(REPLACE(REPLACE(TRIM(role), ' ', '_'), '-', '_')) IN ('data_entry', 'finance')`);
  }

  async down(): Promise<void> {
    // Retired roles are intentionally not recreated.
  }
}
