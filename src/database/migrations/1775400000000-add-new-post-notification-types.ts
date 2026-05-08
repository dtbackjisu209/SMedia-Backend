import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNewPostNotificationTypes1775400000000 implements MigrationInterface {
  name = 'AddNewPostNotificationTypes1775400000000';

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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
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
        'story_view'
      ) NOT NULL
    `);
  }
}
