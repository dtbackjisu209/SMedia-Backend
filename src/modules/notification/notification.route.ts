import { Router } from 'express';
import { authMiddleware } from '../../core/middleware/auth.middleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import notificationController from './notification.controller.js';

const router = Router();

router.get('/', authMiddleware, asyncHandler(notificationController.getMine));
router.get('/summary', authMiddleware, asyncHandler(notificationController.getSummary));
router.patch('/:notificationId/read', authMiddleware, asyncHandler(notificationController.markRead));
router.patch('/messages/read-by-conversation', authMiddleware, asyncHandler(notificationController.markConversationMessagesRead));
router.patch('/read-all', authMiddleware, asyncHandler(notificationController.markAllRead));
router.delete('/read', authMiddleware, asyncHandler(notificationController.clearRead));

export default router;
