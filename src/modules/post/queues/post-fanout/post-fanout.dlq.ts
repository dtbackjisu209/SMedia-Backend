import { Queue, type Job } from 'bullmq';
import {
	POST_FEED_FANOUT_DLQ_JOB_NAME,
	POST_FEED_FANOUT_DLQ_NAME,
	redisConnection,
} from './post-fanout.constants.js';
import type {
	PostFeedFanoutDlqData,
	PostFeedFanoutJobData,
} from './post-fanout.dto.js';

const postFeedFanoutDlqQueue = new Queue<PostFeedFanoutDlqData>(POST_FEED_FANOUT_DLQ_NAME, {
	connection: redisConnection,
});

export const handlePostFanoutFailedJob = async (
	job: Job<PostFeedFanoutJobData> | undefined,
	error: Error,
): Promise<void> => {
	if (!job) {
		return;
	}

	const maxAttempts = job.opts.attempts ?? 1;
	if (job.attemptsMade < maxAttempts) {
		return;
	}

	await postFeedFanoutDlqQueue.add(POST_FEED_FANOUT_DLQ_JOB_NAME, {
		originalJobId: String(job.id ?? ''),
		failedAtIso: new Date().toISOString(),
		failedReason: error.message,
		data: job.data,
	});
};
