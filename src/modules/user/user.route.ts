import { Router } from 'express';
import userController from './user.controller.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { authMiddleware } from '../../core/middleware/auth.middleware.js';

const router = Router();

router.get('/search', asyncHandler(userController.searchUsers));
router.get('/:id', authMiddleware, asyncHandler(userController.getUserProfile));

export default router;
