import { Queue } from 'bullmq';
import {
	DEFAULT_JOB_OPTIONS,
	POST_FEED_FANOUT_JOB_NAME,
	POST_FEED_FANOUT_QUEUE_NAME,
	redisConnection,
} from './post-fanout.constants.js';
import type { PostFeedFanoutJobData } from './post-fanout.dto.js';

const postFeedFanoutQueue = new Queue<PostFeedFanoutJobData>(POST_FEED_FANOUT_QUEUE_NAME, {
	connection: redisConnection,
	defaultJobOptions: DEFAULT_JOB_OPTIONS,
});

export const enqueuePostFeedFanout = async (data: PostFeedFanoutJobData): Promise<void> => {
	await postFeedFanoutQueue.add(POST_FEED_FANOUT_JOB_NAME, data);
};
