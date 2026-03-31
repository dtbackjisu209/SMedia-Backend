import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLikeCommentCountToPost1774189442333 implements MigrationInterface {
    name = 'AddLikeCommentCountToPost1774189442333'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`posts\` ADD \`like_count\` int NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE \`posts\` ADD \`comment_count\` int NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE \`stories\` DROP COLUMN \`expires_at\``);
        await queryRunner.query(`ALTER TABLE \`stories\` ADD \`expires_at\` timestamp NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`stories\` DROP COLUMN \`created_at\``);
        await queryRunner.query(`ALTER TABLE \`stories\` ADD \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`stories\` DROP COLUMN \`created_at\``);
        await queryRunner.query(`ALTER TABLE \`stories\` ADD \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`stories\` DROP COLUMN \`expires_at\``);
        await queryRunner.query(`ALTER TABLE \`stories\` ADD \`expires_at\` datetime NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`posts\` DROP COLUMN \`comment_count\``);
        await queryRunner.query(`ALTER TABLE \`posts\` DROP COLUMN \`like_count\``);
    }

}
