import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddNotificationClearAcknowledgement1786081000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('users', 'notificationsClearedAt'))) {
      await queryRunner.addColumn('users', new TableColumn({ name: 'notificationsClearedAt', type: 'datetime', isNullable: true }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('users', 'notificationsClearedAt')) {
      await queryRunner.dropColumn('users', 'notificationsClearedAt');
    }
  }
}
