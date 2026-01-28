import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1769599359919 implements MigrationInterface {
    name = 'Init1769599359919'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`users\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`username\` varchar(30) NOT NULL, \`email\` varchar(255) NOT NULL, \`password_hash\` varchar(255) NOT NULL, \`full_name\` varchar(100) NULL, \`bio\` text NULL, \`avatar_url\` text NULL, \`is_verified\` tinyint NOT NULL DEFAULT 0, \`is_private\` tinyint NOT NULL DEFAULT 0, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_fe0bb3f6520ee0469504521e71\` (\`username\`), UNIQUE INDEX \`IDX_97672ac88f789774dd47f7c8be\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`posts\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`caption\` text NULL, \`location\` varchar(255) NULL, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`user_id\` bigint NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`post_media\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`media_url\` text NOT NULL, \`media_type\` enum ('image', 'video') NOT NULL, \`position\` int NOT NULL DEFAULT '0', \`post_id\` bigint NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`hashtags\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`name\` varchar(50) NOT NULL, UNIQUE INDEX \`IDX_7fedde18872deb14e4889361d7\` (\`name\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`post_hashtags\` (\`post_id\` bigint NOT NULL, \`hashtag_id\` bigint NOT NULL, PRIMARY KEY (\`post_id\`, \`hashtag_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`comments\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`content\` text NOT NULL, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`post_id\` bigint NULL, \`user_id\` bigint NULL, \`parent_id\` bigint NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`post_likes\` (\`user_id\` bigint NOT NULL, \`post_id\` bigint NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`user_id\`, \`post_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`reports\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`target_type\` enum ('user', 'post', 'comment') NOT NULL, \`target_id\` bigint NOT NULL, \`reason\` text NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`reporter_id\` bigint NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`follows\` (\`follower_id\` bigint NOT NULL, \`following_id\` bigint NOT NULL, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`follower_id\`, \`following_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`conversations\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`messages\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`content\` text NULL, \`media_url\` text NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`conversation_id\` bigint NULL, \`sender_id\` bigint NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`conversation_members\` (\`conversation_id\` bigint NOT NULL, \`user_id\` bigint NOT NULL, PRIMARY KEY (\`conversation_id\`, \`user_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`notifications\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`type\` enum ('like', 'comment', 'follow', 'mention', 'story_view') NOT NULL, \`reference_id\` bigint NULL, \`is_read\` tinyint NOT NULL DEFAULT 0, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`user_id\` bigint NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`stories\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`media_url\` text NOT NULL, \`media_type\` enum ('image', 'video') NOT NULL, \`expires_at\` datetime NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`user_id\` bigint NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`story_views\` (\`story_id\` bigint NOT NULL, \`user_id\` bigint NOT NULL, \`viewed_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`story_id\`, \`user_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`user_blocks\` (\`blocker_id\` bigint NOT NULL, \`blocked_id\` bigint NOT NULL, PRIMARY KEY (\`blocker_id\`, \`blocked_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`posts\` ADD CONSTRAINT \`FK_c4f9a7bd77b489e711277ee5986\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`post_media\` ADD CONSTRAINT \`FK_1eeb54a4fdfbe9db17899243cbe\` FOREIGN KEY (\`post_id\`) REFERENCES \`posts\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`post_hashtags\` ADD CONSTRAINT \`FK_6c16a0f366b0642259bbe50481c\` FOREIGN KEY (\`post_id\`) REFERENCES \`posts\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`post_hashtags\` ADD CONSTRAINT \`FK_41f5ee7a97e67023d7461fa8f43\` FOREIGN KEY (\`hashtag_id\`) REFERENCES \`hashtags\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`comments\` ADD CONSTRAINT \`FK_259bf9825d9d198608d1b46b0b5\` FOREIGN KEY (\`post_id\`) REFERENCES \`posts\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`comments\` ADD CONSTRAINT \`FK_4c675567d2a58f0b07cef09c13d\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`comments\` ADD CONSTRAINT \`FK_d6f93329801a93536da4241e386\` FOREIGN KEY (\`parent_id\`) REFERENCES \`comments\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`post_likes\` ADD CONSTRAINT \`FK_9b9a7fc5eeff133cf71b8e06a7b\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`post_likes\` ADD CONSTRAINT \`FK_b40d37469c501092203d285af80\` FOREIGN KEY (\`post_id\`) REFERENCES \`posts\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`reports\` ADD CONSTRAINT \`FK_9459b9bf907a3807ef7143d2ead\` FOREIGN KEY (\`reporter_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`follows\` ADD CONSTRAINT \`FK_54b5dc2739f2dea57900933db66\` FOREIGN KEY (\`follower_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`follows\` ADD CONSTRAINT \`FK_c518e3988b9c057920afaf2d8c0\` FOREIGN KEY (\`following_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`messages\` ADD CONSTRAINT \`FK_3bc55a7c3f9ed54b520bb5cfe23\` FOREIGN KEY (\`conversation_id\`) REFERENCES \`conversations\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`messages\` ADD CONSTRAINT \`FK_22133395bd13b970ccd0c34ab22\` FOREIGN KEY (\`sender_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`conversation_members\` ADD CONSTRAINT \`FK_36340a1704b039608e34244511f\` FOREIGN KEY (\`conversation_id\`) REFERENCES \`conversations\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`conversation_members\` ADD CONSTRAINT \`FK_a46c76be8f62c4b00a835cdc370\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`notifications\` ADD CONSTRAINT \`FK_9a8a82462cab47c73d25f49261f\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`stories\` ADD CONSTRAINT \`FK_ab4ee230faf536e7c5aee12f4ea\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`story_views\` ADD CONSTRAINT \`FK_e30910f5c5e7cefc96f92d17331\` FOREIGN KEY (\`story_id\`) REFERENCES \`stories\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`story_views\` ADD CONSTRAINT \`FK_957569250010b2ec66127999d15\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`user_blocks\` ADD CONSTRAINT \`FK_dfcd8a81016d1de587fbd2d70bf\` FOREIGN KEY (\`blocker_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`user_blocks\` ADD CONSTRAINT \`FK_7a0806a54f0ad9ced3e247cacd1\` FOREIGN KEY (\`blocked_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user_blocks\` DROP FOREIGN KEY \`FK_7a0806a54f0ad9ced3e247cacd1\``);
        await queryRunner.query(`ALTER TABLE \`user_blocks\` DROP FOREIGN KEY \`FK_dfcd8a81016d1de587fbd2d70bf\``);
        await queryRunner.query(`ALTER TABLE \`story_views\` DROP FOREIGN KEY \`FK_957569250010b2ec66127999d15\``);
        await queryRunner.query(`ALTER TABLE \`story_views\` DROP FOREIGN KEY \`FK_e30910f5c5e7cefc96f92d17331\``);
        await queryRunner.query(`ALTER TABLE \`stories\` DROP FOREIGN KEY \`FK_ab4ee230faf536e7c5aee12f4ea\``);
        await queryRunner.query(`ALTER TABLE \`notifications\` DROP FOREIGN KEY \`FK_9a8a82462cab47c73d25f49261f\``);
        await queryRunner.query(`ALTER TABLE \`conversation_members\` DROP FOREIGN KEY \`FK_a46c76be8f62c4b00a835cdc370\``);
        await queryRunner.query(`ALTER TABLE \`conversation_members\` DROP FOREIGN KEY \`FK_36340a1704b039608e34244511f\``);
        await queryRunner.query(`ALTER TABLE \`messages\` DROP FOREIGN KEY \`FK_22133395bd13b970ccd0c34ab22\``);
        await queryRunner.query(`ALTER TABLE \`messages\` DROP FOREIGN KEY \`FK_3bc55a7c3f9ed54b520bb5cfe23\``);
        await queryRunner.query(`ALTER TABLE \`follows\` DROP FOREIGN KEY \`FK_c518e3988b9c057920afaf2d8c0\``);
        await queryRunner.query(`ALTER TABLE \`follows\` DROP FOREIGN KEY \`FK_54b5dc2739f2dea57900933db66\``);
        await queryRunner.query(`ALTER TABLE \`reports\` DROP FOREIGN KEY \`FK_9459b9bf907a3807ef7143d2ead\``);
        await queryRunner.query(`ALTER TABLE \`post_likes\` DROP FOREIGN KEY \`FK_b40d37469c501092203d285af80\``);
        await queryRunner.query(`ALTER TABLE \`post_likes\` DROP FOREIGN KEY \`FK_9b9a7fc5eeff133cf71b8e06a7b\``);
        await queryRunner.query(`ALTER TABLE \`comments\` DROP FOREIGN KEY \`FK_d6f93329801a93536da4241e386\``);
        await queryRunner.query(`ALTER TABLE \`comments\` DROP FOREIGN KEY \`FK_4c675567d2a58f0b07cef09c13d\``);
        await queryRunner.query(`ALTER TABLE \`comments\` DROP FOREIGN KEY \`FK_259bf9825d9d198608d1b46b0b5\``);
        await queryRunner.query(`ALTER TABLE \`post_hashtags\` DROP FOREIGN KEY \`FK_41f5ee7a97e67023d7461fa8f43\``);
        await queryRunner.query(`ALTER TABLE \`post_hashtags\` DROP FOREIGN KEY \`FK_6c16a0f366b0642259bbe50481c\``);
        await queryRunner.query(`ALTER TABLE \`post_media\` DROP FOREIGN KEY \`FK_1eeb54a4fdfbe9db17899243cbe\``);
        await queryRunner.query(`ALTER TABLE \`posts\` DROP FOREIGN KEY \`FK_c4f9a7bd77b489e711277ee5986\``);
        await queryRunner.query(`DROP TABLE \`user_blocks\``);
        await queryRunner.query(`DROP TABLE \`story_views\``);
        await queryRunner.query(`DROP TABLE \`stories\``);
        await queryRunner.query(`DROP TABLE \`notifications\``);
        await queryRunner.query(`DROP TABLE \`conversation_members\``);
        await queryRunner.query(`DROP TABLE \`messages\``);
        await queryRunner.query(`DROP TABLE \`conversations\``);
        await queryRunner.query(`DROP TABLE \`follows\``);
        await queryRunner.query(`DROP TABLE \`reports\``);
        await queryRunner.query(`DROP TABLE \`post_likes\``);
        await queryRunner.query(`DROP TABLE \`comments\``);
        await queryRunner.query(`DROP TABLE \`post_hashtags\``);
        await queryRunner.query(`DROP INDEX \`IDX_7fedde18872deb14e4889361d7\` ON \`hashtags\``);
        await queryRunner.query(`DROP TABLE \`hashtags\``);
        await queryRunner.query(`DROP TABLE \`post_media\``);
        await queryRunner.query(`DROP TABLE \`posts\``);
        await queryRunner.query(`DROP INDEX \`IDX_97672ac88f789774dd47f7c8be\` ON \`users\``);
        await queryRunner.query(`DROP INDEX \`IDX_fe0bb3f6520ee0469504521e71\` ON \`users\``);
        await queryRunner.query(`DROP TABLE \`users\``);
    }

}
