import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStoryHighlights1775700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const highlightsTable = await queryRunner.getTable('story_highlights');
    if (!highlightsTable) {
      await queryRunner.query(
        `CREATE TABLE \`story_highlights\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`title\` varchar(100) NOT NULL, \`cover_media_url\` text NULL, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`user_id\` bigint NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
      );
      await queryRunner.query(
        `ALTER TABLE \`story_highlights\` ADD CONSTRAINT \`FK_story_highlights_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
      );
    }

    const itemsTable = await queryRunner.getTable('story_highlight_items');
    if (!itemsTable) {
      await queryRunner.query(
        `CREATE TABLE \`story_highlight_items\` (\`highlight_id\` bigint NOT NULL, \`story_id\` bigint NOT NULL, \`added_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`highlight_id\`, \`story_id\`)) ENGINE=InnoDB`,
      );
      await queryRunner.query(
        `ALTER TABLE \`story_highlight_items\` ADD CONSTRAINT \`FK_story_highlight_items_highlight\` FOREIGN KEY (\`highlight_id\`) REFERENCES \`story_highlights\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
      );
      await queryRunner.query(
        `ALTER TABLE \`story_highlight_items\` ADD CONSTRAINT \`FK_story_highlight_items_story\` FOREIGN KEY (\`story_id\`) REFERENCES \`stories\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const itemsTable = await queryRunner.getTable('story_highlight_items');
    if (itemsTable) {
      await queryRunner.query(
        `ALTER TABLE \`story_highlight_items\` DROP FOREIGN KEY \`FK_story_highlight_items_story\``,
      );
      await queryRunner.query(
        `ALTER TABLE \`story_highlight_items\` DROP FOREIGN KEY \`FK_story_highlight_items_highlight\``,
      );
      await queryRunner.query(`DROP TABLE \`story_highlight_items\``);
    }

    const highlightsTable = await queryRunner.getTable('story_highlights');
    if (highlightsTable) {
      await queryRunner.query(
        `ALTER TABLE \`story_highlights\` DROP FOREIGN KEY \`FK_story_highlights_user\``,
      );
      await queryRunner.query(`DROP TABLE \`story_highlights\``);
    }
  }
}
