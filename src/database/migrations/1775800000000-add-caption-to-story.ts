import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCaptionToStory1775800000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`stories\` ADD \`caption\` text NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`stories\` DROP COLUMN \`caption\``);
    }
}
