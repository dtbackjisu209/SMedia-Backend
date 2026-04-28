import { Queue, type Job } from 'bullmq';
import {
	UNFOLLOW_FEED_CLEANUP_DLQ_JOB_NAME,
	UNFOLLOW_FEED_CLEANUP_DLQ_NAME,
	redisConnection,
} from './unfollow-feed-cleanup.constants.js';
import type {
	UnfollowFeedCleanupDlqData,
	UnfollowFeedCleanupJobData,
} from './unfollow-feed-cleanup.dto.js';

const unfollowFeedCleanupDlqQueue = new Queue<UnfollowFeedCleanupDlqData>(
	UNFOLLOW_FEED_CLEANUP_DLQ_NAME,
	{
		connection: redisConnection,
	},
);

export const handleUnfollowFeedCleanupFailedJob = async (
	job: Job<UnfollowFeedCleanupJobData> | undefined,
	error: Error,
): Promise<void> => {
	if (!job) {
		return;
	}

	const maxAttempts = job.opts.attempts ?? 1;
	if (job.attemptsMade < maxAttempts) {
		return;
	}

	await unfollowFeedCleanupDlqQueue.add(UNFOLLOW_FEED_CLEANUP_DLQ_JOB_NAME, {
		originalJobId: String(job.id ?? ''),
		failedAtIso: new Date().toISOString(),
		failedReason: error.message,
		data: job.data,
	});
};
