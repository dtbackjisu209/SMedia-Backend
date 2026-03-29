import { Request, Response } from 'express';
import { ConversationMemberService } from './conversationMember.service.js';

const memberService = new ConversationMemberService();

export class ConversationMemberController {
    // API: GET /api/v1/conversations/:id/members
    async listMembers(req: Request, res: Response) {
        const { id } = req.params;
        const members = await memberService.getMembersByConversation(Number(id));
        return res.json(members);
    }

    // API: POST /api/v1/conversations/:id/members
    async inviteMember(req: Request, res: Response) {
        const { id } = req.params;
        const { userId } = req.body;
        
        const result = await memberService.addMember(Number(id), userId);
        
        // Sau khi lưu DB xong, bạn nên bắn một thông báo Socket 
        // ở đây để người được mời biết mình vào nhóm (dùng io.to(`user_${userId}`))
        
        return res.status(201).json(result);
    }
}