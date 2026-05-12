import type { NextFunction, Request, Response } from 'express';
import { BadRequestError, AuthFailError } from '../../core/handler/error.response.js';
import { CREATED, OK } from '../../core/handler/success.response.js';
import storyService from './story.service.js';
import { ContentModerationService } from '../../core/handler/moderation.service.js';

class StoryController {
	public async moderateContent(req: Request, res: Response, _next: NextFunction): Promise<void> {
		const { content } = req.body;
		if (!content) {
			throw new BadRequestError('Content is required for moderation');
		}

		const result = await ContentModerationService.moderateContent(content);

		new OK({
			message: 'Content moderation completed',
			data: result,
		}).send(res);
	}

	public async createStory(req: Request, res: Response, _next: NextFunction): Promise<void> {
		if (!req.userId) {
			throw new AuthFailError();
		}

		if (!req.file) {
			throw new BadRequestError('Story media is required');
		}

		const { content } = req.body;
		const story = await storyService.createStory(req.userId, req.file, content);

		new CREATED({
			message: story.moderation?.status === 'WARNING' 
				? `Story published with warning: ${story.moderation.reason}` 
				: 'Story published successfully',
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
}

export default new StoryController();
