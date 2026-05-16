import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMuteFieldsToConversationMember1775500000001
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('conversation_members');
    if (!table) return;

    if (!table.findColumnByName('muted_until')) {
      await queryRunner.query(
        `ALTER TABLE \`conversation_members\` ADD COLUMN \`muted_until\` datetime NULL`,
      );
    }

    if (!table.findColumnByName('muted_forever')) {
      await queryRunner.query(
        `ALTER TABLE \`conversation_members\` ADD COLUMN \`muted_forever\` tinyint NOT NULL DEFAULT 0`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('conversation_members');
    if (!table) return;

    if (table.findColumnByName('muted_forever')) {
      await queryRunner.query(
        `ALTER TABLE \`conversation_members\` DROP COLUMN \`muted_forever\``,
      );
    }

    if (table.findColumnByName('muted_until')) {
      await queryRunner.query(
        `ALTER TABLE \`conversation_members\` DROP COLUMN \`muted_until\``,
      );
    }
  }
}
