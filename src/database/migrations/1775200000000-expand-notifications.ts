import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExpandNotifications1775200000000 implements MigrationInterface {
  name = 'ExpandNotifications1775200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`notifications\`
      MODIFY \`type\` enum(
        'like',
        'comment',
        'follow',
        'follow_request',
        'follow_accept',
        'message',
        'mention',
        'story_view',
        'new_post',
        'new_story'
      ) NOT NULL
    `);
    const hasContentColumn = await queryRunner.hasColumn('notifications', 'content');
    if (!hasContentColumn) {
      await queryRunner.query(`
        ALTER TABLE \`notifications\`
        ADD COLUMN \`content\` text NULL AFTER \`type\`
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasContentColumn = await queryRunner.hasColumn('notifications', 'content');
    if (hasContentColumn) {
      await queryRunner.query(`
        ALTER TABLE \`notifications\`
        DROP COLUMN \`content\`
      `);
    }

    await queryRunner.query(`
      ALTER TABLE \`notifications\`
      MODIFY \`type\` enum(
        'like',
        'comment',
        'follow',
        'mention',
        'story_view'
      ) NOT NULL
    `);
  }
}
