import type { Job } from 'bullmq';
import postRepository from '../../post.repository.js';
import postRedisService from '../../redis/post.redis.service.js';
import type { PostCacheRefreshJobData } from './post-cache-refresh.dto.js';

export const processPostCacheRefresh = async (
	job: Job<PostCacheRefreshJobData>,
): Promise<void> => {
	const { postId } = job.data;

	const [postCacheData] = await postRepository.getFeedCacheDataByPostIds([postId]);

	if (!postCacheData) {
		await postRedisService.deletePostCache(postId);
		return;
	}

	await postRedisService.cachePostCacheDataBatch([postCacheData]);
};
