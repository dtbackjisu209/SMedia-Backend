import { Worker } from 'bullmq';
import {
	POST_CACHE_REFRESH_QUEUE_NAME,
	redisConnection,
} from './post-cache-refresh.constants.js';
import { handlePostCacheRefreshFailedJob } from './post-cache-refresh.dlq.js';
import type { PostCacheRefreshJobData } from './post-cache-refresh.dto.js';
import { processPostCacheRefresh } from './post-cache-refresh.processor.js';

let postCacheRefreshWorker: Worker<PostCacheRefreshJobData> | null = null;

export const startPostCacheRefreshWorker = (): Worker<PostCacheRefreshJobData> => {
	if (postCacheRefreshWorker) {
		return postCacheRefreshWorker;
	}

	postCacheRefreshWorker = new Worker<PostCacheRefreshJobData>(
		POST_CACHE_REFRESH_QUEUE_NAME,
		async (job) => {
			await processPostCacheRefresh(job);
		},
		{
			connection: redisConnection,
		},
	);

	postCacheRefreshWorker.on('failed', handlePostCacheRefreshFailedJob);
	postCacheRefreshWorker.on('error', (error) => {
		console.error('[post-cache-refresh] worker error:', error);
	});

	return postCacheRefreshWorker;
};

export const stopPostCacheRefreshWorker = async (): Promise<void> => {
	if (!postCacheRefreshWorker) {
		return;
	}

	await postCacheRefreshWorker.close();
	postCacheRefreshWorker = null;
};
