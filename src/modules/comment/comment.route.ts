import { Router } from 'express';
import { authMiddleware } from '../../core/middleware/auth.middleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import commentController from './comment.controller.js';

const router = Router();


router.get('/:postId', asyncHandler(commentController.getCommentsByPost));


router.post('/:postId', authMiddleware, asyncHandler(commentController.createComment));


router.delete('/:commentId', authMiddleware, asyncHandler(commentController.deleteComment));

export default router;
