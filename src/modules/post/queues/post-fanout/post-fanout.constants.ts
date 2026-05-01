import type { JobsOptions } from 'bullmq';
import { bullmqRedisConnection } from '../../../../core/config/redis.js';

export const POST_FEED_FANOUT_QUEUE_NAME = 'post-feed-fanout';
export const POST_FEED_FANOUT_JOB_NAME = 'fanout-new-post';

export const POST_FEED_FANOUT_DLQ_NAME = 'post-feed-fanout-dlq';
export const POST_FEED_FANOUT_DLQ_JOB_NAME = 'dead-letter-fanout-new-post';

export const DEFAULT_JOB_OPTIONS: JobsOptions = {
	attempts: 3,
	backoff: {
		type: 'exponential',
		delay: 2000,
	},
	removeOnComplete: true,
};

export const redisConnection = bullmqRedisConnection;
