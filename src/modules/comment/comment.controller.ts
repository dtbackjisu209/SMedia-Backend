import type { NextFunction, Request, Response } from 'express';
import { AuthFailError, BadRequestError } from '../../core/handler/error.response.js';
import { CREATED, OK } from '../../core/handler/success.response.js';
import commentService from './comment.service.js';

class CommentController {
	public async createComment(req: Request, res: Response, _next: NextFunction): Promise<void> {
		if (!req.userId) {
			throw new AuthFailError();
		}

		const postId = Number(req.params.postId);
		if (!Number.isFinite(postId) || postId <= 0) {
			throw new BadRequestError('postId must be a positive number');
		}

		const { content, parentId } = req.body as { content?: unknown; parentId?: unknown };

		if (typeof content !== 'string' || content.trim() === '') {
			throw new BadRequestError('content is required and must be a non-empty string');
		}

		const trimmedContent = content.trim();
		if (trimmedContent.length > 2000) {
			throw new BadRequestError('content must not exceed 2000 characters');
		}

		let safeParentId: number | undefined;
		if (parentId !== undefined && parentId !== null) {
			safeParentId = Number(parentId);
			if (!Number.isFinite(safeParentId) || safeParentId <= 0) {
				throw new BadRequestError('parentId must be a positive number');
			}
		}

		const result = await commentService.createComment({
			userId: req.userId,
			postId,
			content: trimmedContent,
			parentId: safeParentId,
		});

		new CREATED({
			message: 'Comment created successfully',
			data: result,
		}).send(res);
	}

	public async deleteComment(req: Request, res: Response, _next: NextFunction): Promise<void> {
		if (!req.userId) {
			throw new AuthFailError();
		}

		const commentId = Number(req.params.commentId);
		if (!Number.isFinite(commentId) || commentId <= 0) {
			throw new BadRequestError('commentId must be a positive number');
		}

		const result = await commentService.deleteComment({
			userId: req.userId,
			commentId,
		});

		new OK({
			message: 'Comment deleted successfully',
			data: result,
		}).send(res);
	}

	public async getCommentsByPost(req: Request, res: Response, _next: NextFunction): Promise<void> {
		const postId = Number(req.params.postId);
		if (!Number.isFinite(postId) || postId <= 0) {
			throw new BadRequestError('postId must be a positive number');
		}

		const rawLimit = Number(req.query.limit);
		const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 20;

		const rawCursor = req.query.cursor;
		let cursor: number | undefined;
		if (rawCursor !== undefined && rawCursor !== '') {
			cursor = Number(rawCursor);
			if (!Number.isFinite(cursor) || cursor <= 0) {
				throw new BadRequestError('cursor must be a positive number');
			}
		}

		const result = await commentService.getCommentsByPost({ postId, limit, cursor });

		new OK({
			message: 'Comments fetched successfully',
			data: result,
		}).send(res);
	}
}

export default new CommentController();
