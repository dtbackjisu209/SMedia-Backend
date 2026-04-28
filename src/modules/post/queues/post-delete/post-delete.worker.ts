import { Worker } from 'bullmq';
import {
	POST_DELETE_QUEUE_NAME,
	redisConnection,
} from './post-delete.constants.js';
import { handlePostDeleteCleanupFailedJob } from './post-delete.dlq.js';
import type { PostDeleteCleanupJobData } from './post-delete.dto.js';
import { processPostDeleteCleanup } from './post-delete.processor.js';

let postDeleteCleanupWorker: Worker<PostDeleteCleanupJobData> | null = null;

export const startPostDeleteCleanupWorker = (): Worker<PostDeleteCleanupJobData> => {
	if (postDeleteCleanupWorker) {
		return postDeleteCleanupWorker;
	}

	postDeleteCleanupWorker = new Worker<PostDeleteCleanupJobData>(
		POST_DELETE_QUEUE_NAME,
		async (job) => {
			await processPostDeleteCleanup(job);
		},
		{
			connection: redisConnection,
		},
	);

	postDeleteCleanupWorker.on('failed', handlePostDeleteCleanupFailedJob);
	postDeleteCleanupWorker.on('error', (error) => {
		console.error('[post-delete] worker error:', error);
	});

	return postDeleteCleanupWorker;
};

export const stopPostDeleteCleanupWorker = async (): Promise<void> => {
	if (!postDeleteCleanupWorker) {
		return;
	}

	await postDeleteCleanupWorker.close();
	postDeleteCleanupWorker = null;
};
