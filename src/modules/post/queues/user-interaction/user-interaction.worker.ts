import { Worker } from 'bullmq';
import {
	USER_INTERACTION_QUEUE_NAME,
	redisConnection,
} from './user-interaction.constants.js';
import type { UserInteractionJobData } from './user-interaction.dto.js';
import { handleUserInteractionFailedJob } from './user-interaction.dlq.js';
import { processUserInteraction } from './user-interaction.processor.js';

let userInteractionWorker: Worker<UserInteractionJobData> | null = null;

export const startUserInteractionWorker = (): Worker<UserInteractionJobData> => {
	if (userInteractionWorker) {
		return userInteractionWorker;
	}

	userInteractionWorker = new Worker<UserInteractionJobData>(
		USER_INTERACTION_QUEUE_NAME,
		async (job) => {
			await processUserInteraction(job);
		},
		{
			connection: redisConnection,
		},
	);

	userInteractionWorker.on('failed', handleUserInteractionFailedJob);

	userInteractionWorker.on('error', (error) => {
		console.error('[user-interaction] worker error:', error);
	});

	return userInteractionWorker;
};

export const stopUserInteractionWorker = async (): Promise<void> => {
	if (!userInteractionWorker) {
		return;
	}

	await userInteractionWorker.close();
	userInteractionWorker = null;
};
