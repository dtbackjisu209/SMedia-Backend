import { enqueueUserInteraction } from '../post/queues/user-interaction/user-interaction.producer.js';
import { enqueuePostCacheRefresh } from '../post/queues/post-cache-refresh/post-cache-refresh.producer.js';
import { ForbiddenError, NotFoundError } from '../../core/handler/error.response.js';

import notificationService from '../notification/notification.service.js';
import postRepository from '../post/post.repository.js';
import commentRepository from './comment.repository.js';
import type {
	CreateCommentResultDTO,
	CreateCommentServiceInputDTO,
	DeleteCommentResultDTO,
	DeleteCommentServiceInputDTO,
	GetCommentsByPostResultDTO,
	GetCommentsByPostServiceInputDTO,
} from './comment.dto.js';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

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

	public async deleteComment(payload: DeleteCommentServiceInputDTO): Promise<DeleteCommentResultDTO> {
		const { deleted, postId } = await commentRepository.deleteComment(
			payload.commentId,
			payload.userId,
		);

		if (postId === null) {
			throw new NotFoundError('Comment not found');
		}

		if (!deleted) {
			throw new ForbiddenError('You can only delete your own comments');
		}

		try {
			await enqueuePostCacheRefresh({
				postId,
				trigger: 'comment',
				triggeredAtIso: new Date().toISOString(),
			});
		} catch (error) {
			console.error('[comment] enqueue post cache refresh (delete) failed:', {
				postId,
				error,
			});
		}

		return { deleted: true };
	}

	public async getCommentsByPost(
		payload: GetCommentsByPostServiceInputDTO,
	): Promise<GetCommentsByPostResultDTO> {
		const safeLimit = Math.min(
			Number.isFinite(payload.limit) && payload.limit > 0 ? payload.limit : DEFAULT_LIMIT,
			MAX_LIMIT,
		);

		const rows = await commentRepository.getCommentsByPost(payload.postId, safeLimit + 1, payload.cursor);

		const hasMore = rows.length > safeLimit;
		const comments = hasMore ? rows.slice(0, safeLimit) : rows;
		const nextCursor = hasMore ? comments[comments.length - 1].id : null;

		return { comments, nextCursor };
	}
}

export default new CommentService();
