import { Router } from 'express';
import { authMiddleware } from '../../core/middleware/auth.middleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { upload } from '../../core/middleware/upload.js';
import storyController from './story.controller.js';

const router = Router();

router.post(
	'/',
	authMiddleware,
	upload.single('file'),
	asyncHandler(storyController.createStory),
);
router.post('/highlights', authMiddleware, asyncHandler(storyController.createHighlight));
router.get('/highlights/me', authMiddleware, asyncHandler(storyController.getMyHighlights));
router.get('/me', authMiddleware, asyncHandler(storyController.getMyStories));
router.patch('/highlights/:highlightId', authMiddleware, asyncHandler(storyController.updateHighlight));
router.post(
	'/highlights/:highlightId/stories',
	authMiddleware,
	asyncHandler(storyController.addStoryToHighlight),
);
router.delete(
	'/highlights/:highlightId/stories/:storyId',
	authMiddleware,
	asyncHandler(storyController.removeStoryFromHighlight),
);
router.delete(
	'/highlights/:highlightId',
	authMiddleware,
	asyncHandler(storyController.deleteHighlight),
);

router.delete('/:id', authMiddleware, asyncHandler(storyController.deleteStory));

router.get('/feed', authMiddleware, asyncHandler(storyController.getStoryFeed));

export default router;
