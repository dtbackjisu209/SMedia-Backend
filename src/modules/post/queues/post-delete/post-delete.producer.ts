import { Queue } from 'bullmq';
import {
	DEFAULT_JOB_OPTIONS,
	POST_DELETE_JOB_NAME,
	POST_DELETE_QUEUE_NAME,
	redisConnection,
} from './post-delete.constants.js';
import type { PostDeleteCleanupJobData } from './post-delete.dto.js';

const postDeleteCleanupQueue = new Queue<PostDeleteCleanupJobData>(POST_DELETE_QUEUE_NAME, {
	connection: redisConnection,
	defaultJobOptions: DEFAULT_JOB_OPTIONS,
});

export const enqueuePostDeleteCleanup = async (data: PostDeleteCleanupJobData): Promise<void> => {
	await postDeleteCleanupQueue.add(POST_DELETE_JOB_NAME, data);
};
