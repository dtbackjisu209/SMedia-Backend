import { Queue } from 'bullmq';
import {
	DEFAULT_JOB_OPTIONS,
	POST_CACHE_REFRESH_JOB_NAME,
	POST_CACHE_REFRESH_QUEUE_NAME,
	redisConnection,
} from './post-cache-refresh.constants.js';
import type { PostCacheRefreshJobData } from './post-cache-refresh.dto.js';

const postCacheRefreshQueue = new Queue<PostCacheRefreshJobData>(POST_CACHE_REFRESH_QUEUE_NAME, {
	connection: redisConnection,
	defaultJobOptions: DEFAULT_JOB_OPTIONS,
});

export const enqueuePostCacheRefresh = async (data: PostCacheRefreshJobData): Promise<void> => {
	await postCacheRefreshQueue.add(POST_CACHE_REFRESH_JOB_NAME, data);
};
