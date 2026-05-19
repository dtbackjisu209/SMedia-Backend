import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Catch-up migration: adds columns that exist in entities but were never
 * included in any previous migration (schema drift fix).
 */
export class FixMissingColumns1775600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── messages ──────────────────────────────────────────────────────────
    const messagesTable = await queryRunner.getTable('messages');
    if (messagesTable) {
      if (!messagesTable.findColumnByName('deleted_for_user_ids')) {
        await queryRunner.query(
          `ALTER TABLE \`messages\` ADD COLUMN \`deleted_for_user_ids\` text NULL`,
        );
      }
      if (!messagesTable.findColumnByName('is_recalled')) {
        await queryRunner.query(
          `ALTER TABLE \`messages\` ADD COLUMN \`is_recalled\` tinyint NOT NULL DEFAULT 0`,
        );
      }
      if (!messagesTable.findColumnByName('reply_to_message_id')) {
        await queryRunner.query(
          `ALTER TABLE \`messages\` ADD COLUMN \`reply_to_message_id\` bigint NULL`,
        );
        await queryRunner.query(
          `ALTER TABLE \`messages\` ADD CONSTRAINT \`FK_messages_reply_to_message\` FOREIGN KEY (\`reply_to_message_id\`) REFERENCES \`messages\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
        );
      }
      if (!messagesTable.findColumnByName('reactions')) {
        await queryRunner.query(
          `ALTER TABLE \`messages\` ADD COLUMN \`reactions\` text NULL`,
        );
      }
    }

    // ── conversation_members ───────────────────────────────────────────────
    const membersTable = await queryRunner.getTable('conversation_members');
    if (membersTable) {
      if (!membersTable.findColumnByName('nickname')) {
        await queryRunner.query(
          `ALTER TABLE \`conversation_members\` ADD COLUMN \`nickname\` varchar(255) NULL`,
        );
      }
      if (!membersTable.findColumnByName('muted_until')) {
        await queryRunner.query(
          `ALTER TABLE \`conversation_members\` ADD COLUMN \`muted_until\` datetime NULL`,
        );
      }
      if (!membersTable.findColumnByName('muted_forever')) {
        await queryRunner.query(
          `ALTER TABLE \`conversation_members\` ADD COLUMN \`muted_forever\` tinyint NOT NULL DEFAULT 0`,
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`messages\` DROP COLUMN IF EXISTS \`deleted_for_user_ids\`, DROP COLUMN IF EXISTS \`is_recalled\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`conversation_members\` DROP COLUMN IF EXISTS \`nickname\`, DROP COLUMN IF EXISTS \`muted_until\`, DROP COLUMN IF EXISTS \`muted_forever\``,
    );
  }
}
