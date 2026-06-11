import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLastReadAtToConversationMember1776000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('conversation_members');
    if (!table) return;

    if (!table.findColumnByName('last_read_at')) {
      await queryRunner.query(
        `ALTER TABLE \`conversation_members\` ADD COLUMN \`last_read_at\` datetime NULL`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('conversation_members');
    if (!table) return;

    if (table.findColumnByName('last_read_at')) {
      await queryRunner.query(
        `ALTER TABLE \`conversation_members\` DROP COLUMN \`last_read_at\``,
      );
    }
  }
}
