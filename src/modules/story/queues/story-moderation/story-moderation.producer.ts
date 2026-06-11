import { Queue } from 'bullmq';
import {
	DEFAULT_JOB_OPTIONS,
	STORY_MODERATION_JOB_NAME,
	STORY_MODERATION_QUEUE_NAME,
	redisConnection,
} from './story-moderation.constants.js';
import type { StoryModerationJobData } from './story-moderation.dto.js';

const storyModerationQueue = new Queue<StoryModerationJobData>(STORY_MODERATION_QUEUE_NAME, {
	connection: redisConnection,
	defaultJobOptions: DEFAULT_JOB_OPTIONS,
});

export const enqueueStoryModeration = async (data: StoryModerationJobData): Promise<void> => {
	await storyModerationQueue.add(STORY_MODERATION_JOB_NAME, data);
};
