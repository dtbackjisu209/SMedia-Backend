import type { Job } from 'bullmq';
import { cloudinary } from '../../../../core/config/cloudinary.js';
import { getFollowerIdsByUserId } from '../../../follow/follow.repository.js';
import postRedisService from '../../redis/post.redis.service.js';
import type { PostDeleteCleanupJobData } from './post-delete.dto.js';

const FEED_BATCH_SIZE = 1000;

const toCloudinaryPublicId = (mediaUrl: string): string | null => {
	try {
		const parsed = new URL(mediaUrl);
		const uploadMarker = '/upload/';
		const markerIndex = parsed.pathname.indexOf(uploadMarker);
		if (markerIndex === -1) {
			return null;
		}

		let publicPath = parsed.pathname.slice(markerIndex + uploadMarker.length);
		publicPath = publicPath.replace(/^v\d+\//, '');

		if (publicPath.length === 0) {
			return null;
		}

		return publicPath.replace(/\.[^./]+$/, '');
	} catch {
		return null;
	}
};

export const processPostDeleteCleanup = async (
	job: Job<PostDeleteCleanupJobData>,
): Promise<void> => {
	const { postId, authorId, media } = job.data;

	await postRedisService.deletePostCache(postId);

	const followerIds = await getFollowerIdsByUserId(authorId);
	const feedUserIds = Array.from(new Set([...followerIds, authorId]));

	for (let index = 0; index < feedUserIds.length; index += FEED_BATCH_SIZE) {
		const chunk = feedUserIds.slice(index, index + FEED_BATCH_SIZE);
		await postRedisService.removePostIdFromFeeds(chunk, postId);
	}

	for (const mediaItem of media) {
		const publicId = toCloudinaryPublicId(mediaItem.mediaUrl);
		if (!publicId) {
			continue;
		}

		try {
			await cloudinary.uploader.destroy(publicId, {
				resource_type: mediaItem.mediaType,
			});
		} catch (error) {
			console.error('[post-delete] cloudinary destroy failed:', {
				postId,
				mediaUrl: mediaItem.mediaUrl,
				error,
			});
		}
	}
};
