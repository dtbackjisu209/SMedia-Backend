import { Queue } from 'bullmq';
import {
	DEFAULT_JOB_OPTIONS,
	USER_INTERACTION_JOB_NAME,
	USER_INTERACTION_QUEUE_NAME,
	redisConnection,
} from './user-interaction.constants.js';
import type { UserInteractionJobData } from './user-interaction.dto.js';

const userInteractionQueue = new Queue<UserInteractionJobData>(USER_INTERACTION_QUEUE_NAME, {
	connection: redisConnection,
	defaultJobOptions: DEFAULT_JOB_OPTIONS,
});

export const enqueueUserInteraction = async (
	userId: number,
	postId: number,
	type: UserInteractionJobData['type'],
	tags: string[],
): Promise<void> => {
	await userInteractionQueue.add(USER_INTERACTION_JOB_NAME, {
		userId,
		postId,
		type,
		tags,
	});
};
