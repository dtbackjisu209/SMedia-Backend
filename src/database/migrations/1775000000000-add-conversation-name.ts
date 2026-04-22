import { MigrationInterface, QueryRunner } from "typeorm";

export class AddConversationName1775000000000 implements MigrationInterface {
  name = 'AddConversationName1775000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasNameColumn = await queryRunner.hasColumn('conversations', 'name');
    if (!hasNameColumn) {
      await queryRunner.query("ALTER TABLE `conversations` ADD `name` varchar(255) NULL");
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasNameColumn = await queryRunner.hasColumn('conversations', 'name');
    if (hasNameColumn) {
      await queryRunner.query("ALTER TABLE `conversations` DROP COLUMN `name`");
    }

}
}
