import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMessageRepliesAndReactions1775400000000 implements MigrationInterface {
  name = 'AddMessageRepliesAndReactions1775400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `messages` ADD `reply_to_message_id` bigint NULL, ADD `reactions` text NULL',
    );
    await queryRunner.query(
      'ALTER TABLE `messages` ADD CONSTRAINT `FK_messages_reply_to_message` FOREIGN KEY (`reply_to_message_id`) REFERENCES `messages`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `messages` DROP FOREIGN KEY `FK_messages_reply_to_message`');
    await queryRunner.query('ALTER TABLE `messages` DROP COLUMN `reactions`, DROP COLUMN `reply_to_message_id`');
  }
}
