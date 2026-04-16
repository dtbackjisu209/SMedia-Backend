import type { Job } from 'bullmq';
import { AppDataSource } from '../../../../data-source.js';
import { UserInteraction } from '../../../../database/entity/userInteraction.entity.js';
import postRedisService from '../../redis/post.redis.service.js';
import type { UserInteractionJobData } from './user-interaction.dto.js';

const INTERACTION_DELTA: Record<UserInteractionJobData['type'], number> = {
	like: 1,
	comment: 2,
	view: 0.2,
};

export const processUserInteraction = async (
	job: Job<UserInteractionJobData>,
): Promise<void> => {
	const { userId, postId, type, tags } = job.data;

	const normalizedTags = [...new Set(
		tags.map((tag) => tag.trim().toLowerCase()).filter((tag) => tag.length > 0),
	)];

	await AppDataSource.getRepository(UserInteraction).insert({
		user_id: userId,
		post_id: postId,
		type,
		tag_snapshot: normalizedTags,
	});

	const delta = INTERACTION_DELTA[type];
	if (delta > 0 && normalizedTags.length > 0) {
		await postRedisService.incrementUserInterest(userId, normalizedTags, delta);
	}
};
