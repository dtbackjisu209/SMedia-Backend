import { Router } from 'express';
import { authMiddleware } from '../../core/middleware/auth.middleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import profileController from './profile.controller.js';

const router = Router();

router.get('/search', asyncHandler(profileController.search));
router.get('/users/:userId', authMiddleware, asyncHandler(profileController.getProfile));
router.patch('/me', authMiddleware, asyncHandler(profileController.updateMyProfile));
router.patch('/me/password', authMiddleware, asyncHandler(profileController.changeMyPassword));

export default router;
