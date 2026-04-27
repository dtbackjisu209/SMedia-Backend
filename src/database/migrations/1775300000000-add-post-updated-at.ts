import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPostUpdatedAt1775300000000 implements MigrationInterface {
  name = 'AddPostUpdatedAt1775300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasUpdatedAt = await queryRunner.hasColumn('posts', 'updated_at');
    if (!hasUpdatedAt) {
      await queryRunner.query(`
        ALTER TABLE \`posts\`
        ADD COLUMN \`updated_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasUpdatedAt = await queryRunner.hasColumn('posts', 'updated_at');
    if (hasUpdatedAt) {
      await queryRunner.query(`
        ALTER TABLE \`posts\`
        DROP COLUMN \`updated_at\`
      `);
    }
  }
}
