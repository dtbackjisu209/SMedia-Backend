import type { NextFunction, Request, Response } from 'express';
import { BadRequestError, AuthFailError } from '../../core/handler/error.response.js';
import { CREATED, OK } from '../../core/handler/success.response.js';
import storyService from './story.service.js';

class StoryController {
	public async createStory(req: Request, res: Response, _next: NextFunction): Promise<void> {
		if (!req.userId) {
			throw new AuthFailError();
		}

		if (!req.file) {
			throw new BadRequestError('Story media is required');
		}

		const story = await storyService.createStory(req.userId, req.file);

		new CREATED({
			message: 'Story published successfully',
			data: story,
		}).send(res);
	}

	public async getStoryFeed(req: Request, res: Response, _next: NextFunction): Promise<void> {
		if (!req.userId) {
			throw new AuthFailError();
		}

		const stories = await storyService.getStoryFeed(req.userId);

		new OK({
			message: 'Fetch story feed successfully',
			data: stories,
		}).send(res);
	}

	public async deleteStory(req: Request, res: Response, _next: NextFunction): Promise<void> {
		if (!req.userId) {
			throw new AuthFailError();
		}

		const { id } = req.params;
		await storyService.deleteStory(req.userId, Number(id));

		new OK({
			message: 'Story deleted successfully',
		}).send(res);
	}

	public async createHighlight(req: Request, res: Response, _next: NextFunction): Promise<void> {
		if (!req.userId) {
			throw new AuthFailError();
		}

		const title = typeof req.body?.title === 'string' ? req.body.title : '';
		const storyIds = Array.isArray(req.body?.storyIds) ? req.body.storyIds : [];
		const highlight = await storyService.createHighlight(req.userId, { title, storyIds });

		new CREATED({
			message: 'Story highlight created successfully',
			data: highlight,
		}).send(res);
	}

	public async getMyHighlights(req: Request, res: Response, _next: NextFunction): Promise<void> {
		if (!req.userId) {
			throw new AuthFailError();
		}

		const highlights = await storyService.getHighlightsByUserId(req.userId);

		new OK({
			message: 'Fetch story highlights successfully',
			data: highlights,
		}).send(res);
	}

	public async getMyStories(req: Request, res: Response, _next: NextFunction): Promise<void> {
		if (!req.userId) {
			throw new AuthFailError();
		}

		const stories = await storyService.getStoriesByUserId(req.userId);

		new OK({
			message: 'Fetch my stories successfully',
			data: stories,
		}).send(res);
	}

	public async getStoriesByUserId(req: Request, res: Response, _next: NextFunction): Promise<void> {
		if (!req.userId) {
			throw new AuthFailError();
		}

		const targetUserId = Number(req.params.userId);
		if (!Number.isFinite(targetUserId) || targetUserId <= 0) {
			throw new BadRequestError('Invalid user id');
		}

		const stories = await storyService.getActiveStoriesByUserId(targetUserId);

		new OK({
			message: 'Fetch user stories successfully',
			data: stories,
		}).send(res);
	}

	public async updateHighlight(req: Request, res: Response, _next: NextFunction): Promise<void> {
		if (!req.userId) {
			throw new AuthFailError();
		}

		const highlightId = Number(req.params.highlightId);
		if (!Number.isFinite(highlightId) || highlightId <= 0) {
			throw new BadRequestError('Invalid highlight id');
		}

		const title = typeof req.body?.title === 'string' ? req.body.title : '';
		const highlight = await storyService.updateHighlight(req.userId, highlightId, { title });

		new OK({
			message: 'Story highlight updated successfully',
			data: highlight,
		}).send(res);
	}

	public async addStoryToHighlight(req: Request, res: Response, _next: NextFunction): Promise<void> {
		if (!req.userId) {
			throw new AuthFailError();
		}

		const highlightId = Number(req.params.highlightId);
		const storyId = Number(req.body?.storyId);

		if (!Number.isFinite(highlightId) || highlightId <= 0 || !Number.isFinite(storyId) || storyId <= 0) {
			throw new BadRequestError('Invalid highlight id or story id');
		}

		const highlight = await storyService.addStoryToHighlight(req.userId, highlightId, storyId);

		new OK({
			message: 'Story added to highlight successfully',
			data: highlight,
		}).send(res);
	}

	public async removeStoryFromHighlight(req: Request, res: Response, _next: NextFunction): Promise<void> {
		if (!req.userId) {
			throw new AuthFailError();
		}

		const highlightId = Number(req.params.highlightId);
		const storyId = Number(req.params.storyId);

		if (!Number.isFinite(highlightId) || highlightId <= 0 || !Number.isFinite(storyId) || storyId <= 0) {
			throw new BadRequestError('Invalid highlight id or story id');
		}

		const highlight = await storyService.removeStoryFromHighlight(req.userId, highlightId, storyId);

		new OK({
			message: 'Story removed from highlight successfully',
			data: highlight,
		}).send(res);
	}

	public async deleteHighlight(req: Request, res: Response, _next: NextFunction): Promise<void> {
		if (!req.userId) {
			throw new AuthFailError();
		}

		const highlightId = Number(req.params.highlightId);
		if (!Number.isFinite(highlightId) || highlightId <= 0) {
			throw new BadRequestError('Invalid highlight id');
		}

		await storyService.deleteHighlight(req.userId, highlightId);

		new OK({
			message: 'Story highlight deleted successfully',
		}).send(res);
	}
}

export default new StoryController();
