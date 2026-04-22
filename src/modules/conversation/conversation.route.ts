import { Router } from 'express';
import conversationController from './conversation.controller.js';

const router = Router();

router.get('/search-users', conversationController.searchUsers.bind(conversationController));
router.get('/group-candidates', conversationController.getGroupCandidates.bind(conversationController));
router.get('/user/:userId', conversationController.getUserConversations.bind(conversationController));
router.post('/private', conversationController.getOrCreatePrivateChat.bind(conversationController));
router.post('/group', conversationController.createGroupChat.bind(conversationController));
router.get('/:id/messages', conversationController.getMessages.bind(conversationController));

export default router;
