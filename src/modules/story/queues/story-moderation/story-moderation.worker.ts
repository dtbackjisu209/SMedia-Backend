import { Worker } from 'bullmq';
import {
	STORY_MODERATION_QUEUE_NAME,
	redisConnection,
} from './story-moderation.constants.js';
import { handleStoryModerationFailedJob } from './story-moderation.dlq.js';
import type { StoryModerationJobData } from './story-moderation.dto.js';
import { processStoryModeration } from './story-moderation.processor.js';

let storyModerationWorker: Worker<StoryModerationJobData> | null = null;

export const startStoryModerationWorker = (): Worker<StoryModerationJobData> => {
	if (storyModerationWorker) {
		return storyModerationWorker;
	}

	storyModerationWorker = new Worker<StoryModerationJobData>(
		STORY_MODERATION_QUEUE_NAME,
		async (job) => {
			await processStoryModeration(job);
		},
		{
			connection: redisConnection,
		},
	);

	storyModerationWorker.on('failed', handleStoryModerationFailedJob);
	storyModerationWorker.on('error', (error) => {
		console.error('[story-moderation] worker error:', error);
	});

	return storyModerationWorker;
};

export const stopStoryModerationWorker = async (): Promise<void> => {
	if (!storyModerationWorker) {
		return;
	}

	await storyModerationWorker.close();
	storyModerationWorker = null;
};
