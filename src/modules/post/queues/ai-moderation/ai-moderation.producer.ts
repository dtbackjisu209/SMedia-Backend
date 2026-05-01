import { Queue } from 'bullmq';
import {
	AI_MODERATION_JOB_NAME,
	AI_MODERATION_QUEUE_NAME,
	DEFAULT_JOB_OPTIONS,
	redisConnection,
} from './ai-moderation.constants.js';
import type { AiModerationJobData } from './ai-moderation.dto.js';

const aiModerationQueue = new Queue<AiModerationJobData>(AI_MODERATION_QUEUE_NAME, {
	connection: redisConnection,
	defaultJobOptions: DEFAULT_JOB_OPTIONS,
});

export const enqueueAiModeration = async (data: AiModerationJobData): Promise<void> => {
	await aiModerationQueue.add(AI_MODERATION_JOB_NAME, data);
};
