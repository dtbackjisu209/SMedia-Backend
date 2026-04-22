import type { JobsOptions } from 'bullmq';
import { redisQueueConnection } from '../../../../core/config/redis.js';

export const USER_INTERACTION_QUEUE_NAME = 'user-interaction';
export const USER_INTERACTION_JOB_NAME = 'track-user-interaction';

export const USER_INTERACTION_DLQ_NAME = 'user-interaction-dlq';
export const USER_INTERACTION_DLQ_JOB_NAME = 'dead-letter-track-user-interaction';

export const DEFAULT_JOB_OPTIONS: JobsOptions = {
	attempts: 3,
	backoff: {
		type: 'exponential',
		delay: 2000,
	},
	removeOnComplete: true,
};

export const redisConnection = redisQueueConnection;
