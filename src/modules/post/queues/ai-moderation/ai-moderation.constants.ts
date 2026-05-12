import type { JobsOptions } from 'bullmq';
import { bullmqRedisConnection } from '../../../../core/config/redis.js';

export const AI_MODERATION_QUEUE_NAME = 'ai-moderation';
export const AI_MODERATION_JOB_NAME = 'moderate-post';

export const AI_MODERATION_DLQ_NAME = 'ai-moderation-dlq';
export const AI_MODERATION_DLQ_JOB_NAME = 'dead-letter-moderate-post';

export const DEFAULT_JOB_OPTIONS: JobsOptions = {
	attempts: 3,
	backoff: {
		type: 'exponential',
		delay: 3000,
	},
	removeOnComplete: true,
};

export const redisConnection = bullmqRedisConnection;
