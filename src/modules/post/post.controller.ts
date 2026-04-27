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

	public async updatePost(req: Request, res: Response, _next: NextFunction): Promise<void> {
		if (!req.userId) {
			throw new AuthFailError();
		}

		const postId = Number(req.params.postId);
		if (!Number.isFinite(postId) || postId <= 0) {
			throw new BadRequestError('postId must be a positive number');
		}

		if (req.body.tags !== undefined && !Array.isArray(req.body.tags)) {
			throw new BadRequestError('tags must be an array of strings');
		}

		if (req.body.caption !== undefined && typeof req.body.caption !== 'string') {
			throw new BadRequestError('caption must be a string');
		}

		if (req.body.location !== undefined && typeof req.body.location !== 'string') {
			throw new BadRequestError('location must be a string');
		}

		if (Array.isArray(req.body.tags) && req.body.tags.some((value: unknown) => typeof value !== 'string')) {
			throw new BadRequestError('tags must be an array of strings');
		}

		const result = await postService.updatePost(req.userId, postId, {
			caption: typeof req.body.caption === 'string' ? req.body.caption : undefined,
			location: typeof req.body.location === 'string' ? req.body.location : undefined,
			tags: Array.isArray(req.body.tags) ? (req.body.tags as string[]) : undefined,
		});

		new OK({
			message: 'Post updated successfully',
			data: result,
		}).send(res);
	}

	public async deletePost(req: Request, res: Response, _next: NextFunction): Promise<void> {
		if (!req.userId) {
			throw new AuthFailError();
		}

		const postId = Number(req.params.postId);
		if (!Number.isFinite(postId) || postId <= 0) {
			throw new BadRequestError('postId must be a positive number');
		}

		const result = await postService.deletePost(req.userId, postId);

		new OK({
			message: 'Post deleted successfully',
			data: result,
		}).send(res);
	}
}

export default new PostController();

