"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "CreateProfileViews1784800000000", {
    enumerable: true,
    get: function() {
        return CreateProfileViews1784800000000;
    }
});
const _typeorm = require("typeorm");
let CreateProfileViews1784800000000 = class CreateProfileViews1784800000000 {
    async up(queryRunner) {
        await queryRunner.createTable(new _typeorm.Table({
            name: 'profile_views',
            columns: [
                {
                    name: 'id',
                    type: 'varchar',
                    length: '36',
                    isPrimary: true
                },
                {
                    name: 'profileUserId',
                    type: 'varchar',
                    length: '255'
                },
                {
                    name: 'viewerUserId',
                    type: 'varchar',
                    length: '255'
                },
                {
                    name: 'createdAt',
                    type: 'datetime',
                    default: 'CURRENT_TIMESTAMP'
                }
            ],
            foreignKeys: [
                {
                    columnNames: [
                        'profileUserId'
                    ],
                    referencedTableName: 'users',
                    referencedColumnNames: [
                        'id'
                    ],
                    onDelete: 'CASCADE'
                },
                {
                    columnNames: [
                        'viewerUserId'
                    ],
                    referencedTableName: 'users',
                    referencedColumnNames: [
                        'id'
                    ],
                    onDelete: 'CASCADE'
                }
            ]
        }), true);
        await queryRunner.createIndex('profile_views', new _typeorm.TableIndex({
            name: 'IDX_profile_views_profile_created',
            columnNames: [
                'profileUserId',
                'createdAt'
            ]
        }));
        await queryRunner.createIndex('profile_views', new _typeorm.TableIndex({
            name: 'IDX_profile_views_viewer_created',
            columnNames: [
                'viewerUserId',
                'createdAt'
            ]
        }));
    }
    async down(queryRunner) {
        await queryRunner.dropTable('profile_views');
    }
};

//# sourceMappingURL=1784800000000-CreateProfileViews.js.map