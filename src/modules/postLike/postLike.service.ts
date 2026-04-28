import { enqueueUserInteraction } from '../post/queues/user-interaction/user-interaction.producer.js';


import notificationService from '../notification/notification.service.js';

import { enqueuePostCacheRefresh } from '../post/queues/post-cache-refresh/post-cache-refresh.producer.js';


import postRepository from '../post/post.repository.js';
import postLikeRepository from './postLike.repository.js';
import type {
	LikePostResultDTO,
	LikePostServiceInputDTO,
	UnlikePostResultDTO,
	UnlikePostServiceInputDTO,
} from './postLike.dto.js';

class PostLikeService {
	public async likePost(payload: LikePostServiceInputDTO): Promise<LikePostResultDTO> {
		const liked = await postLikeRepository.likePost(payload.userId, payload.postId);
		if (!liked) {
			return { liked: false };
		}

		const tags = await postRepository.getTagsByPostId(payload.postId);
		await enqueueUserInteraction(payload.userId, payload.postId, 'like', tags);


		await notificationService.notifyPostLiked(payload.userId, payload.postId);



		try {
			await enqueuePostCacheRefresh({
				postId: payload.postId,
				trigger: 'like',
				triggeredAtIso: new Date().toISOString(),
			});
		} catch (error) {
			console.error('[post-like] enqueue post cache refresh failed:', {
				postId: payload.postId,
				error,
			});
		}


		return { liked: true };
	}

	public async unlikePost(payload: UnlikePostServiceInputDTO): Promise<UnlikePostResultDTO> {
		const unliked = await postLikeRepository.unlikePost(payload.userId, payload.postId);

		if (unliked) {
			try {
				await enqueuePostCacheRefresh({
					postId: payload.postId,
					trigger: 'unlike',
					triggeredAtIso: new Date().toISOString(),
				});
			} catch (error) {
				console.error('[post-like] enqueue post cache refresh failed:', {
					postId: payload.postId,
					error,
				});
			}
		}

		return { unliked };
	}
}

export default new PostLikeService();
