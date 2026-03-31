import type { Job } from 'bullmq';
import { getFollowerIdsByUserId } from '../../../follow/follow.repository.js';
import postRepository from '../../post.repository.js';
import postRedisService from '../../redis/post.redis.service.js';
import type { PostFeedFanoutJobData } from './post-fanout.dto.js';

export const processPostFanout = async (job: Job<PostFeedFanoutJobData>): Promise<void> => {
	const [followerIds, author] = await Promise.all([
		getFollowerIdsByUserId(job.data.userId),
		postRepository.getFeedAuthorByUserId(job.data.userId),
	]);

	const feedUserIds = [...new Set([...followerIds, job.data.userId])];

	await postRedisService.cacheNewPostToFeeds({
		postId: job.data.postId,
		caption: job.data.caption,
		location: job.data.location,
		createdAt: new Date(job.data.createdAtIso),
		likeCount: job.data.likeCount,
		commentCount: job.data.commentCount,
		thumbnail: job.data.thumbnail,
		mediaCount: job.data.mediaCount,
		author,
		feedUserIds,
	});
};
