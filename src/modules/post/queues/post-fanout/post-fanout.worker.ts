import { Worker } from 'bullmq';
import {
	POST_FEED_FANOUT_QUEUE_NAME,
	redisConnection,
} from './post-fanout.constants.js';
import type { PostFeedFanoutJobData } from './post-fanout.dto.js';
import { handlePostFanoutFailedJob } from './post-fanout.dlq.js';
import { processPostFanout } from './post-fanout.processor.js';

let postFeedFanoutWorker: Worker<PostFeedFanoutJobData> | null = null;

export const startPostFeedFanoutWorker = (): Worker<PostFeedFanoutJobData> => {
	if (postFeedFanoutWorker) {
		return postFeedFanoutWorker;
	}

	postFeedFanoutWorker = new Worker<PostFeedFanoutJobData>(
		POST_FEED_FANOUT_QUEUE_NAME,
		async (job) => {
			await processPostFanout(job);
		},
		{
			connection: redisConnection,
		},
	);

	postFeedFanoutWorker.on('failed', handlePostFanoutFailedJob);

	postFeedFanoutWorker.on('error', (error) => {
		console.error('[post-feed-fanout] worker error:', error);
	});

	return postFeedFanoutWorker;
};

export const stopPostFeedFanoutWorker = async (): Promise<void> => {
	if (!postFeedFanoutWorker) {
		return;
	}

	await postFeedFanoutWorker.close();
	postFeedFanoutWorker = null;
};
