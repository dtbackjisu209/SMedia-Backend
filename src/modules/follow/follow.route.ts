import { Router } from 'express';
import followController from './follow.controller.js';
import { authMiddleware } from '../../core/middleware/auth.middleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

router.post('/follow', authMiddleware, asyncHandler(followController.follow));
router.delete('/follow', authMiddleware, asyncHandler(followController.unfollow));
router.post('/follow/accept', authMiddleware, asyncHandler(followController.acceptRequest));
router.post('/follow/reject', authMiddleware, asyncHandler(followController.rejectRequest));
router.get('/follow/suggestions', authMiddleware, asyncHandler(followController.getFollowSuggestions));

router.get('/users/:userId/followers', asyncHandler(followController.getFollowers));
router.get('/users/:userId/following', asyncHandler(followController.getFollowing));

export default router;
