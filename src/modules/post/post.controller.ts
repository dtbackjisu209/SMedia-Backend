import type { NextFunction, Request, Response } from 'express';
import { AuthFailError, BadRequestError } from '../../core/handler/error.response.js';
import { CREATED, OK } from '../../core/handler/success.response.js';
import postService from './post.service.js';

class PostController {
	public async getFeed(req: Request, res: Response, _next: NextFunction): Promise<void> {
		if (!req.userId) {
			throw new AuthFailError();
		}

		const feed = await postService.getFeed(req.userId);

		new OK({
			message: 'Feed fetched successfully',
			data: feed,
		}).send(res);
	}

	public async getPostDetail(req: Request, res: Response, _next: NextFunction): Promise<void> {
		if (!req.userId) {
			throw new AuthFailError();
		}

		const postId = Number(req.params.postId);
		if (!Number.isFinite(postId) || postId <= 0) {
			throw new BadRequestError('postId must be a positive number');
		}

		const post = await postService.getPostDetail(postId);

		new OK({
			message: 'Post detail fetched successfully',
			data: post,
		}).send(res);
	}

	public async getUploadSignature(req: Request, res: Response, _next: NextFunction): Promise<void> {
		if (!req.userId) {
			throw new AuthFailError();
		}

		new OK({
			message: 'Cloudinary signature generated',
			data: postService.getUploadSignature(),
		}).send(res);
	}

	public async createPost(req: Request, res: Response, _next: NextFunction): Promise<void> {
		if (!req.userId) {
			throw new AuthFailError();
		}

		if (!Array.isArray(req.body.media)) {
			throw new BadRequestError('media must be an array of uploaded file urls');
		}

		const post = await postService.createPost(req.userId, {
			caption: typeof req.body.caption === 'string' ? req.body.caption : undefined,
			location: typeof req.body.location === 'string' ? req.body.location : undefined,
			media: req.body.media,
		});

		new CREATED({
			message: 'Post created successfully',
			data: post,
		}).send(res);
	}
}

export default new PostController();

