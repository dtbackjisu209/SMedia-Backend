import { Router } from 'express';
import { ConversationMemberController } from './conversationMember.controller.js';

const router = Router();
const controller = new ConversationMemberController();

// Lấy danh sách thành viên của cuộc hội thoại
// GET /api/v1/conversations/:id/members
router.get('/:id/members', controller.listMembers.bind(controller));

// Mời thêm thành viên vào nhóm
// POST /api/v1/conversations/:id/members  body: { userId: number }
router.post('/:id/members', controller.inviteMember.bind(controller));

// Xóa thành viên khỏi nhóm (rời nhóm)
// DELETE /api/v1/conversations/:id/members/:userId
router.delete('/:id/members/:userId', controller.removeMember.bind(controller));

export default router;