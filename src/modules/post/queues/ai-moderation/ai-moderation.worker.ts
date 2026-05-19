import { Worker } from 'bullmq';
import {
	AI_MODERATION_QUEUE_NAME,
	redisConnection,
} from './ai-moderation.constants.js';
import { handleAiModerationFailedJob } from './ai-moderation.dlq.js';
import type { AiModerationJobData } from './ai-moderation.dto.js';
import { processAiModeration } from './ai-moderation.processor.js';

let aiModerationWorker: Worker<AiModerationJobData> | null = null;

export const startAiModerationWorker = (): Worker<AiModerationJobData> => {
	if (aiModerationWorker) {
		return aiModerationWorker;
	}

	aiModerationWorker = new Worker<AiModerationJobData>(
		AI_MODERATION_QUEUE_NAME,
		async (job) => {
			await processAiModeration(job);
		},
		{
			connection: redisConnection,
		},
	);

	aiModerationWorker.on('failed', handleAiModerationFailedJob);
	aiModerationWorker.on('error', (error) => {
		console.error('[ai-moderation] worker error:', error);
	});

	return aiModerationWorker;
};

export const stopAiModerationWorker = async (): Promise<void> => {
	if (!aiModerationWorker) {
		return;
	}

	await aiModerationWorker.close();
	aiModerationWorker = null;
};
