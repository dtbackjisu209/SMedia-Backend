import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import postController from '../controllers/post.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/upload-signature', authMiddleware, asyncHandler(postController.getUploadSignature));
router.post('/', authMiddleware, asyncHandler(postController.createPost));

export default router;
