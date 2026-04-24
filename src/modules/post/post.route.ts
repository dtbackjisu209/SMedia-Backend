import { Router } from 'express';
import { authMiddleware } from '../../core/middleware/auth.middleware.js';
import postController from './post.controller.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

router.get('/feed', authMiddleware, asyncHandler(postController.getFeed));
router.get('/upload-signature', authMiddleware, asyncHandler(postController.getUploadSignature));
router.post('/', authMiddleware, asyncHandler(postController.createPost));
router.delete('/:postId', authMiddleware, asyncHandler(postController.deletePost));
router.get('/:postId', authMiddleware, asyncHandler(postController.getPostDetail));

export default router;

