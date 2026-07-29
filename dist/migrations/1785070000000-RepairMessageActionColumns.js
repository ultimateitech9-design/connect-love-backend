"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "RepairMessageActionColumns1785070000000", {
    enumerable: true,
    get: function() {
        return RepairMessageActionColumns1785070000000;
    }
});
const _typeorm = require("typeorm");
let RepairMessageActionColumns1785070000000 = class RepairMessageActionColumns1785070000000 {
    async up(queryRunner) {
        const columns = [
            new _typeorm.TableColumn({
                name: 'reactions',
                type: 'text',
                isNullable: true
            }),
            new _typeorm.TableColumn({
                name: 'deletedForUserIds',
                type: 'text',
                isNullable: true
            }),
            new _typeorm.TableColumn({
                name: 'deletedForEveryone',
                type: 'tinyint',
                default: 0
            }),
            new _typeorm.TableColumn({
                name: 'pinnedByUserIds',
                type: 'text',
                isNullable: true
            }),
            new _typeorm.TableColumn({
                name: 'starredByUserIds',
                type: 'text',
                isNullable: true
            }),
            new _typeorm.TableColumn({
                name: 'replyToMessageId',
                type: 'varchar',
                length: '36',
                isNullable: true
            }),
            new _typeorm.TableColumn({
                name: 'editedAt',
                type: 'datetime',
                isNullable: true
            })
        ];
        for (const column of columns){
            if (!await queryRunner.hasColumn('messages', column.name)) {
                await queryRunner.addColumn('messages', column);
            }
        }
    }
    async down() {
    // This is a production schema repair. Do not remove columns that may have
    // existed before this migration or now contain user message-action data.
    }
    constructor(){
        this.name = 'RepairMessageActionColumns1785070000000';
    }
};

//# sourceMappingURL=1785070000000-RepairMessageActionColumns.js.map