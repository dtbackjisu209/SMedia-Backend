import { enqueueUserInteraction } from '../post/queues/user-interaction/user-interaction.producer.js';

import notificationService from '../notification/notification.service.js';

import { enqueuePostCacheRefresh } from '../post/queues/post-cache-refresh/post-cache-refresh.producer.js';

import postRepository from '../post/post.repository.js';
import commentRepository from './comment.repository.js';
import type {
	CreateCommentResultDTO,
	CreateCommentServiceInputDTO,
} from './comment.dto.js';

class CommentService {
	public async createComment(payload: CreateCommentServiceInputDTO): Promise<CreateCommentResultDTO> {
		const result = await commentRepository.createComment(payload);

		const tags = await postRepository.getTagsByPostId(payload.postId);
		await enqueueUserInteraction(payload.userId, payload.postId, 'comment', tags);
		await notificationService.notifyPostCommented(payload.userId, payload.postId);

		try {
			await enqueuePostCacheRefresh({
				postId: payload.postId,
				trigger: 'comment',
				triggeredAtIso: new Date().toISOString(),
			});
		} catch (error) {
			console.error('[comment] enqueue post cache refresh failed:', {
				postId: payload.postId,
				error,
			});
		}

		return result;
	}
}

export default new CommentService();
