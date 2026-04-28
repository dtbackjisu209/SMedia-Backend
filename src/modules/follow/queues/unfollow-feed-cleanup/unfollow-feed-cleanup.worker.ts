import { Worker } from 'bullmq';
import {
	UNFOLLOW_FEED_CLEANUP_QUEUE_NAME,
	redisConnection,
} from './unfollow-feed-cleanup.constants.js';
import { handleUnfollowFeedCleanupFailedJob } from './unfollow-feed-cleanup.dlq.js';
import type { UnfollowFeedCleanupJobData } from './unfollow-feed-cleanup.dto.js';
import { processUnfollowFeedCleanup } from './unfollow-feed-cleanup.processor.js';

let unfollowFeedCleanupWorker: Worker<UnfollowFeedCleanupJobData> | null = null;

export const startUnfollowFeedCleanupWorker = (): Worker<UnfollowFeedCleanupJobData> => {
	if (unfollowFeedCleanupWorker) {
		return unfollowFeedCleanupWorker;
	}

	unfollowFeedCleanupWorker = new Worker<UnfollowFeedCleanupJobData>(
		UNFOLLOW_FEED_CLEANUP_QUEUE_NAME,
		async (job) => {
			await processUnfollowFeedCleanup(job);
		},
		{
			connection: redisConnection,
		},
	);

	unfollowFeedCleanupWorker.on('failed', handleUnfollowFeedCleanupFailedJob);
	unfollowFeedCleanupWorker.on('error', (error) => {
		console.error('[unfollow-feed-cleanup] worker error:', error);
	});

	return unfollowFeedCleanupWorker;
};

export const stopUnfollowFeedCleanupWorker = async (): Promise<void> => {
	if (!unfollowFeedCleanupWorker) {
		return;
	}

	await unfollowFeedCleanupWorker.close();
	unfollowFeedCleanupWorker = null;
};
