import type { Job } from 'bullmq';
import postRepository from '../../../post/post.repository.js';
import postRedisService from '../../../post/redis/post.redis.service.js';
import type { UnfollowFeedCleanupJobData } from './unfollow-feed-cleanup.dto.js';

export const processUnfollowFeedCleanup = async (
	job: Job<UnfollowFeedCleanupJobData>,
): Promise<void> => {
	const { viewerUserId, targetAuthorId } = job.data;

	const feedPostIds = await postRedisService.getAllFeedPostIds(viewerUserId);
	if (feedPostIds.length === 0) {
		return;
	}

	const authorByPostId = await postRepository.getPostAuthorIdsByPostIds(feedPostIds);
	const postIdsToRemove = feedPostIds.filter(
		(postId) => authorByPostId.get(postId) === targetAuthorId,
	);

	if (postIdsToRemove.length === 0) {
		return;
	}

	await postRedisService.removePostIdsFromFeed(viewerUserId, postIdsToRemove);
};
