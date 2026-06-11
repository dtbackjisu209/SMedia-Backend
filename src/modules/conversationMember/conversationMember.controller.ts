import { Request, Response } from 'express';
import { ConversationMemberService } from './conversationMember.service.js';

const memberService = new ConversationMemberService();

export class ConversationMemberController {
    /**
     * GET /api/v1/conversations/:id/members
     * Lấy danh sách thành viên
     */
    async listMembers(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const members = await memberService.getMembersByConversation(Number(id));
            return res.status(200).json({ success: true, data: members });
        } catch (error) {
            console.error('[MemberController] listMembers:', error);
            return res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách thành viên' });
        }
    }

    /**
     * POST /api/v1/conversations/:id/members
     * Body: { userId: number }
     * Mời thành viên vào nhóm
     */
    async inviteMember(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { userId } = req.body;

            if (!userId) {
                return res.status(400).json({ success: false, message: 'Thiếu userId' });
            }

            const result = await memberService.addMember(Number(id), Number(userId));
            return res.status(201).json({ success: true, data: result });
        } catch (error) {
            console.error('[MemberController] inviteMember:', error);
            return res.status(500).json({ success: false, message: 'Lỗi khi thêm thành viên' });
        }
    }

    /**
     * DELETE /api/v1/conversations/:id/members/:userId
     * Xóa thành viên hoặc rời nhóm
     */
    async removeMember(req: Request, res: Response) {
        try {
            const { id, userId } = req.params;
            await memberService.removeMember(Number(id), Number(userId));
            return res.status(200).json({ success: true, message: 'Đã rời nhóm thành công' });
        } catch (error) {
            console.error('[MemberController] removeMember:', error);
            return res.status(500).json({ success: false, message: 'Lỗi khi rời nhóm' });
        }
    }
}