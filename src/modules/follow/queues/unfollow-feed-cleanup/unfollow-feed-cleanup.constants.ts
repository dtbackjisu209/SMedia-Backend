import type { JobsOptions } from 'bullmq';
import { bullmqRedisConnection } from '../../../../core/config/redis.js';

export const UNFOLLOW_FEED_CLEANUP_QUEUE_NAME = 'unfollow-feed-cleanup';
export const UNFOLLOW_FEED_CLEANUP_JOB_NAME = 'cleanup-unfollowed-author-from-feed';

export const UNFOLLOW_FEED_CLEANUP_DLQ_NAME = 'unfollow-feed-cleanup-dlq';
export const UNFOLLOW_FEED_CLEANUP_DLQ_JOB_NAME = 'dead-letter-cleanup-unfollowed-author-from-feed';

export const DEFAULT_JOB_OPTIONS: JobsOptions = {
	attempts: 3,
	backoff: {
		type: 'exponential',
		delay: 2000,
	},
	removeOnComplete: true,
};

export const redisConnection = bullmqRedisConnection;
