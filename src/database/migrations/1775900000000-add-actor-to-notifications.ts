import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddActorToNotifications1775900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const notificationsTable = await queryRunner.getTable('notifications');
    if (!notificationsTable) {
      return;
    }

    if (!notificationsTable.findColumnByName('actor_id')) {
      await queryRunner.query(
        'ALTER TABLE `notifications` ADD COLUMN `actor_id` bigint NULL',
      );
    }

    const hasActorFk = notificationsTable.foreignKeys.some(
      (fk) => fk.columnNames.includes('actor_id'),
    );
    if (!hasActorFk) {
      await queryRunner.query(
        'ALTER TABLE `notifications` ADD CONSTRAINT `FK_notifications_actor` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION',
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const notificationsTable = await queryRunner.getTable('notifications');
    if (!notificationsTable) {
      return;
    }

    const actorFk = notificationsTable.foreignKeys.find((fk) => fk.columnNames.includes('actor_id'));
    if (actorFk) {
      await queryRunner.query(
        `ALTER TABLE \`notifications\` DROP FOREIGN KEY \`${actorFk.name}\``,
      );
    }

    if (notificationsTable.findColumnByName('actor_id')) {
      await queryRunner.query(
        'ALTER TABLE `notifications` DROP COLUMN `actor_id`',
      );
    }
  }
}
