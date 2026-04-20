import { Router } from 'express';
import { authMiddleware } from '../../core/middleware/auth.middleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import notificationController from './notification.controller.js';

const router = Router();

router.get('/', authMiddleware, asyncHandler(notificationController.getMine));
router.patch('/read-all', authMiddleware, asyncHandler(notificationController.markAllRead));

export default router;
