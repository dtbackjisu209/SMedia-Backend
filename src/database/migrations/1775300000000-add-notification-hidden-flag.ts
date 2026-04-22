import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationHiddenFlag1775300000000 implements MigrationInterface {
  name = 'AddNotificationHiddenFlag1775300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasHiddenColumn = await queryRunner.hasColumn('notifications', 'is_hidden');
    if (!hasHiddenColumn) {
      await queryRunner.query(`
        ALTER TABLE \`notifications\`
        ADD COLUMN \`is_hidden\` tinyint NOT NULL DEFAULT 0 AFTER \`is_read\`
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasHiddenColumn = await queryRunner.hasColumn('notifications', 'is_hidden');
    if (hasHiddenColumn) {
      await queryRunner.query(`
        ALTER TABLE \`notifications\`
        DROP COLUMN \`is_hidden\`
      `);
    }
  }
}
