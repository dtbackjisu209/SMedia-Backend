import type { NextFunction, Request, Response } from 'express';
import { AuthFailError, BadRequestError } from '../../core/handler/error.response.js';
import { OK } from '../../core/handler/success.response.js';
import postLikeService from './postLike.service.js';

class PostLikeController {
	public async likePost(req: Request, res: Response, _next: NextFunction): Promise<void> {
		if (!req.userId) {
			throw new AuthFailError();
		}

		const postId = Number(req.params.postId);
		if (!Number.isFinite(postId) || postId <= 0) {
			throw new BadRequestError('postId must be a positive number');
		}

		const result = await postLikeService.likePost({
			userId: req.userId,
			postId,
		});

		new OK({
			message: result.liked ? 'Post liked successfully' : 'Post already liked',
			data: result,
		}).send(res);
	}

	public async unlikePost(req: Request, res: Response, _next: NextFunction): Promise<void> {
		if (!req.userId) {
			throw new AuthFailError();
		}

		const postId = Number(req.params.postId);
		if (!Number.isFinite(postId) || postId <= 0) {
			throw new BadRequestError('postId must be a positive number');
		}

		const result = await postLikeService.unlikePost({
			userId: req.userId,
			postId,
		});

		new OK({
			message: result.unliked ? 'Post unliked successfully' : 'Post was not liked',
			data: result,
		}).send(res);
	}
}

export default new PostLikeController();
