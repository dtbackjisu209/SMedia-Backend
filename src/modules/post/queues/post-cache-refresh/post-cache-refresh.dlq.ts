import { Queue, type Job } from 'bullmq';
import {
	POST_CACHE_REFRESH_DLQ_JOB_NAME,
	POST_CACHE_REFRESH_DLQ_NAME,
	redisConnection,
} from './post-cache-refresh.constants.js';
import type { PostCacheRefreshDlqData, PostCacheRefreshJobData } from './post-cache-refresh.dto.js';

const postCacheRefreshDlqQueue = new Queue<PostCacheRefreshDlqData>(POST_CACHE_REFRESH_DLQ_NAME, {
	connection: redisConnection,
});

export const handlePostCacheRefreshFailedJob = async (
	job: Job<PostCacheRefreshJobData> | undefined,
	error: Error,
): Promise<void> => {
	if (!job) {
		return;
	}

	const maxAttempts = job.opts.attempts ?? 1;
	if (job.attemptsMade < maxAttempts) {
		return;
	}

	await postCacheRefreshDlqQueue.add(POST_CACHE_REFRESH_DLQ_JOB_NAME, {
		originalJobId: String(job.id ?? ''),
		failedAtIso: new Date().toISOString(),
		failedReason: error.message,
		data: job.data,
	});
};
