import { Queue, type Job } from 'bullmq';
import {
	AI_MODERATION_DLQ_JOB_NAME,
	AI_MODERATION_DLQ_NAME,
	redisConnection,
} from './ai-moderation.constants.js';
import type { AiModerationDlqData, AiModerationJobData } from './ai-moderation.dto.js';

const aiModerationDlqQueue = new Queue<AiModerationDlqData>(AI_MODERATION_DLQ_NAME, {
	connection: redisConnection,
});

export const handleAiModerationFailedJob = async (
	job: Job<AiModerationJobData> | undefined,
	error: Error,
): Promise<void> => {
	if (!job) {
		return;
	}

	const maxAttempts = job.opts.attempts ?? 1;
	if (job.attemptsMade < maxAttempts) {
		return;
	}

	await aiModerationDlqQueue.add(AI_MODERATION_DLQ_JOB_NAME, {
		originalJobId: String(job.id ?? ''),
		failedAtIso: new Date().toISOString(),
		failedReason: error.message,
		data: job.data,
	});
};
