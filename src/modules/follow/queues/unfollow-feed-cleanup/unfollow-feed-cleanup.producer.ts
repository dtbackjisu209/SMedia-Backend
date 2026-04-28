import { Queue } from 'bullmq';
import {
	DEFAULT_JOB_OPTIONS,
	UNFOLLOW_FEED_CLEANUP_JOB_NAME,
	UNFOLLOW_FEED_CLEANUP_QUEUE_NAME,
	redisConnection,
} from './unfollow-feed-cleanup.constants.js';
import type { UnfollowFeedCleanupJobData } from './unfollow-feed-cleanup.dto.js';

const unfollowFeedCleanupQueue = new Queue<UnfollowFeedCleanupJobData>(
	UNFOLLOW_FEED_CLEANUP_QUEUE_NAME,
	{
		connection: redisConnection,
		defaultJobOptions: DEFAULT_JOB_OPTIONS,
	},
);

export const enqueueUnfollowFeedCleanup = async (
	data: UnfollowFeedCleanupJobData,
): Promise<void> => {
	await unfollowFeedCleanupQueue.add(UNFOLLOW_FEED_CLEANUP_JOB_NAME, data);
};
