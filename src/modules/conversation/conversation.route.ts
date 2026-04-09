import { Router } from 'express';
import conversationController from './conversation.controller.js';

const router = Router();

// Lấy danh sách conversation của user
router.get('/user/:userId', conversationController.getUserConversations.bind(conversationController));

// Tạo hoặc lấy chat 1-1
router.post('/private', conversationController.getOrCreatePrivateChat.bind(conversationController));

// Tạo nhóm chat
router.post('/group', conversationController.createGroupChat.bind(conversationController));

// Lấy lịch sử tin nhắn của conversation
router.get('/:id/messages', conversationController.getMessages.bind(conversationController));

export default router;