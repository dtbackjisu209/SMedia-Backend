import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNicknameToConversationMember1775500000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Kiểm tra nếu cột chưa tồn tại thì mới thêm
    const table = await queryRunner.getTable('conversation_members');
    if (table && !table.findColumnByName('nickname')) {
      await queryRunner.query(
        `ALTER TABLE \`conversation_members\` ADD COLUMN \`nickname\` varchar(255) NULL`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('conversation_members');
    if (table && table.findColumnByName('nickname')) {
      await queryRunner.query(
        `ALTER TABLE \`conversation_members\` DROP COLUMN \`nickname\``,
      );
    }
  }
}
