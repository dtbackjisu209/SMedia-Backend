import { Router } from 'express';
import { authMiddleware } from '../../core/middleware/auth.middleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { upload } from '../../core/middleware/upload.js';
import storyController from './story.controller.js';

const router = Router();

router.post(
	'/moderate',
	authMiddleware,
	asyncHandler(storyController.moderateContent),
);

router.post(
	'/',
	authMiddleware,
	upload.single('file'),
	asyncHandler(storyController.createStory),
);

router.get('/feed', authMiddleware, asyncHandler(storyController.getStoryFeed));

export default router;
