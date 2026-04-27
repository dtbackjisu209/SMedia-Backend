import type { JobsOptions } from 'bullmq';
import { redisQueueConnection } from '../../../../core/config/redis.js';

export const POST_DELETE_QUEUE_NAME = 'post-delete-cleanup';
export const POST_DELETE_JOB_NAME = 'cleanup-deleted-post';

export const POST_DELETE_DLQ_NAME = 'post-delete-cleanup-dlq';
export const POST_DELETE_DLQ_JOB_NAME = 'dead-letter-cleanup-deleted-post';

export const DEFAULT_JOB_OPTIONS: JobsOptions = {
	attempts: 3,
	backoff: {
		type: 'exponential',
		delay: 2000,
	},
	removeOnComplete: true,
};

export const redisConnection = redisQueueConnection;
