import type { JobsOptions } from 'bullmq';
import { redisQueueConnection } from '../../../../core/config/redis.js';

export const POST_CACHE_REFRESH_QUEUE_NAME = 'post-cache-refresh';
export const POST_CACHE_REFRESH_JOB_NAME = 'refresh-post-cache';

export const POST_CACHE_REFRESH_DLQ_NAME = 'post-cache-refresh-dlq';
export const POST_CACHE_REFRESH_DLQ_JOB_NAME = 'dead-letter-refresh-post-cache';

export const DEFAULT_JOB_OPTIONS: JobsOptions = {
	attempts: 3,
	backoff: {
		type: 'exponential',
		delay: 2000,
	},
	// Keep recent jobs so they are visible in Redis/BullMQ UI for debugging.
	removeOnComplete: {
		count: 500,
	},
	removeOnFail: {
		count: 1000,
	},
};

export const redisConnection = redisQueueConnection;
