import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserInteractionsTable1775000000000 implements MigrationInterface {
	name = 'AddUserInteractionsTable1775000000000';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			CREATE TABLE \`user_interactions\` (
				\`id\` bigint NOT NULL AUTO_INCREMENT,
				\`user_id\` bigint NOT NULL,
				\`post_id\` bigint NOT NULL,
				\`type\` varchar(20) NOT NULL,
				\`tag_snapshot\` json NOT NULL,
				\`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
				INDEX \`idx_user_interactions_user_created\` (\`user_id\`, \`created_at\`),
				INDEX \`idx_user_interactions_post_created\` (\`post_id\`, \`created_at\`),
				PRIMARY KEY (\`id\`),
				CONSTRAINT \`fk_user_interactions_user\`
					FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
				CONSTRAINT \`fk_user_interactions_post\`
					FOREIGN KEY (\`post_id\`) REFERENCES \`posts\`(\`id\`) ON DELETE CASCADE
			)
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query('DROP TABLE `user_interactions`');
	}
}
