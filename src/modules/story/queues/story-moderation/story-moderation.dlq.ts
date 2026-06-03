import { Queue, type Job } from 'bullmq';
import {
	STORY_MODERATION_DLQ_JOB_NAME,
	STORY_MODERATION_DLQ_NAME,
	redisConnection,
} from './story-moderation.constants.js';
import type { StoryModerationDlqData, StoryModerationJobData } from './story-moderation.dto.js';

const storyModerationDlqQueue = new Queue<StoryModerationDlqData>(STORY_MODERATION_DLQ_NAME, {
	connection: redisConnection,
});

export const handleStoryModerationFailedJob = async (
	job: Job<StoryModerationJobData> | undefined,
	error: Error,
): Promise<void> => {
	if (!job) {
		return;
	}

	const maxAttempts = job.opts.attempts ?? 1;
	if (job.attemptsMade < maxAttempts) {
		return;
	}

	await storyModerationDlqQueue.add(STORY_MODERATION_DLQ_JOB_NAME, {
		originalJobId: String(job.id ?? ''),
		failedAtIso: new Date().toISOString(),
		failedReason: error.message,
		data: job.data,
	});
};
