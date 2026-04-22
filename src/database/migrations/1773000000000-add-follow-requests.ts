import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFollowRequests1773000000000 implements MigrationInterface {
  name = 'AddFollowRequests1773000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "CREATE TABLE `follow_requests` (`id` bigint NOT NULL AUTO_INCREMENT, `requester_id` bigint NOT NULL, `target_user_id` bigint NOT NULL, `status` enum ('pending', 'accepted', 'rejected') NOT NULL DEFAULT 'pending', `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX `UQ_follow_request_pair` (`requester_id`, `target_user_id`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await queryRunner.query(
      'ALTER TABLE `follow_requests` ADD CONSTRAINT `FK_follow_request_requester` FOREIGN KEY (`requester_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE `follow_requests` ADD CONSTRAINT `FK_follow_request_target` FOREIGN KEY (`target_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `follow_requests` DROP FOREIGN KEY `FK_follow_request_target`');
    await queryRunner.query('ALTER TABLE `follow_requests` DROP FOREIGN KEY `FK_follow_request_requester`');
    await queryRunner.query('DROP INDEX `UQ_follow_request_pair` ON `follow_requests`');
    await queryRunner.query('DROP TABLE `follow_requests`');
  }
}

