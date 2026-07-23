import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateProfileViews1784800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: 'profile_views',
      columns: [
        { name: 'id', type: 'varchar', length: '36', isPrimary: true },
        { name: 'profileUserId', type: 'varchar', length: '255' },
        { name: 'viewerUserId', type: 'varchar', length: '255' },
        { name: 'createdAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
      ],
      foreignKeys: [
        {
          columnNames: ['profileUserId'],
          referencedTableName: 'users',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        },
        {
          columnNames: ['viewerUserId'],
          referencedTableName: 'users',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        },
      ],
    }), true);

    await queryRunner.createIndex('profile_views', new TableIndex({
      name: 'IDX_profile_views_profile_created',
      columnNames: ['profileUserId', 'createdAt'],
    }));
    await queryRunner.createIndex('profile_views', new TableIndex({
      name: 'IDX_profile_views_viewer_created',
      columnNames: ['viewerUserId', 'createdAt'],
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('profile_views');
  }
}
