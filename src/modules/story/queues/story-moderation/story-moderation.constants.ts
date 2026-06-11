import type { JobsOptions } from 'bullmq';
import { bullmqRedisConnection } from '../../../../core/config/redis.js';

export const STORY_MODERATION_QUEUE_NAME = 'story-moderation';
export const STORY_MODERATION_JOB_NAME = 'moderate-story';

export const STORY_MODERATION_DLQ_NAME = 'story-moderation-dlq';
export const STORY_MODERATION_DLQ_JOB_NAME = 'dead-letter-moderate-story';

export const DEFAULT_JOB_OPTIONS: JobsOptions = {
	attempts: 3,
	backoff: {
		type: 'exponential',
		delay: 3000,
	},
	removeOnComplete: true,
};

export const redisConnection = bullmqRedisConnection;
