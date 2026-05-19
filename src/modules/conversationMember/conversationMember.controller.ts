import { Request, Response } from 'express';
import { ConversationMemberService } from './conversationMember.service.js';

const memberService = new ConversationMemberService();

export class ConversationMemberController {
  async listMembers(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const members = await memberService.getMembersByConversation(Number(id));
      return res.status(200).json({ success: true, data: members });
    } catch (error) {
      console.error('[MemberController] listMembers:', error);
      return res.status(500).json({ success: false, message: 'Error while fetching conversation members' });
    }
  }

  async inviteMember(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { userId, requesterId } = req.body;

      if (!userId || !requesterId) {
        return res.status(400).json({ success: false, message: 'userId and requesterId are required' });
      }

      const result = await memberService.addMember(Number(id), Number(userId), Number(requesterId));
      return res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      console.error('[MemberController] inviteMember:', error);
      const status = Number(error?.statusCode ?? error?.status ?? 500);
      return res.status(status).json({ success: false, message: error?.message || 'Error while inviting member' });
    }
  }

  async removeMember(req: Request, res: Response) {
    try {
      const { id, userId } = req.params;
      const requesterId = Number(req.query.requesterId ?? 0);
      const result = await memberService.removeMember(Number(id), Number(userId), requesterId);
      return res.status(200).json({ success: true, data: result, message: 'Member removed successfully' });
    } catch (error: any) {
      console.error('[MemberController] removeMember:', error);
      const status = Number(error?.statusCode ?? error?.status ?? 500);
      return res.status(status).json({ success: false, message: error?.message || 'Error while removing member' });
    }
  }
}
