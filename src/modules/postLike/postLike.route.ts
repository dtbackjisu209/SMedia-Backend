import { Router } from 'express';
import { authMiddleware } from '../../core/middleware/auth.middleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import postLikeController from './postLike.controller.js';

const router = Router();

router.post('/:postId', authMiddleware, asyncHandler(postLikeController.likePost));
router.delete('/:postId', authMiddleware, asyncHandler(postLikeController.unlikePost));

export default router;
