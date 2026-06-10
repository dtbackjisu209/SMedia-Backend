import { Router } from 'express';
import conversationController from './conversation.controller.js';

const router = Router();

router.get('/search-users', conversationController.searchUsers.bind(conversationController));
router.get('/group-candidates', conversationController.getGroupCandidates.bind(conversationController));
router.get('/user/:userId', conversationController.getUserConversations.bind(conversationController));
router.post('/private', conversationController.getOrCreatePrivateChat.bind(conversationController));
router.post('/group', conversationController.createGroupChat.bind(conversationController));
router.patch('/:id/settings', conversationController.updateConversationSettings.bind(conversationController));
router.patch('/:id/read', conversationController.markConversationRead.bind(conversationController));
router.get('/:id/members', conversationController.getConversationMembers.bind(conversationController));
router.post('/:id/members', conversationController.inviteMember.bind(conversationController));
router.delete('/:id/members/:userId', conversationController.removeMember.bind(conversationController));
router.get('/:id/messages', conversationController.getMessages.bind(conversationController));

export default router;
