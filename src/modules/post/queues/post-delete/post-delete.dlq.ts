import { Queue, type Job } from 'bullmq';
import {
	POST_DELETE_DLQ_JOB_NAME,
	POST_DELETE_DLQ_NAME,
	redisConnection,
} from './post-delete.constants.js';
import type {
	PostDeleteCleanupDlqData,
	PostDeleteCleanupJobData,
} from './post-delete.dto.js';

const postDeleteCleanupDlqQueue = new Queue<PostDeleteCleanupDlqData>(POST_DELETE_DLQ_NAME, {
	connection: redisConnection,
});

export const handlePostDeleteCleanupFailedJob = async (
	job: Job<PostDeleteCleanupJobData> | undefined,
	error: Error,
): Promise<void> => {
	if (!job) {
		return;
	}

	const maxAttempts = job.opts.attempts ?? 1;
	if (job.attemptsMade < maxAttempts) {
		return;
	}

	await postDeleteCleanupDlqQueue.add(POST_DELETE_DLQ_JOB_NAME, {
		originalJobId: String(job.id ?? ''),
		failedAtIso: new Date().toISOString(),
		failedReason: error.message,
		data: job.data,
	});
};
