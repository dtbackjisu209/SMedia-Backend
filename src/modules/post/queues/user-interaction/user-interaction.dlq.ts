import { Queue, type Job } from 'bullmq';
import {
	USER_INTERACTION_DLQ_JOB_NAME,
	USER_INTERACTION_DLQ_NAME,
	redisConnection,
} from './user-interaction.constants.js';
import type {
	UserInteractionDlqData,
	UserInteractionJobData,
} from './user-interaction.dto.js';

const userInteractionDlqQueue = new Queue<UserInteractionDlqData>(USER_INTERACTION_DLQ_NAME, {
	connection: redisConnection,
});

export const handleUserInteractionFailedJob = async (
	job: Job<UserInteractionJobData> | undefined,
	error: Error,
): Promise<void> => {
	if (!job) {
		return;
	}

	const maxAttempts = job.opts.attempts ?? 1;
	if (job.attemptsMade < maxAttempts) {
		return;
	}

	await userInteractionDlqQueue.add(USER_INTERACTION_DLQ_JOB_NAME, {
		originalJobId: String(job.id ?? ''),
		failedAtIso: new Date().toISOString(),
		failedReason: error.message,
		data: job.data,
	});
};
