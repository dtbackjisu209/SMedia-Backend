import { Request, Response } from 'express';
import chatService from './conversation.service.js';

class ConversationController {
  async getUserConversations(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const conversations = await chatService.getUserConversations(Number(userId));
      return res.status(200).json({ success: true, data: conversations });
    } catch (error) {
      console.error('[ConversationController] getUserConversations:', error);
      return res.status(500).json({ success: false, message: 'Error while fetching conversations' });
    }
  }

  async getOrCreatePrivateChat(req: Request, res: Response) {
    try {
      const { myId, targetUserId } = req.body;
      if (!myId || !targetUserId) {
        return res.status(400).json({ success: false, message: 'myId and targetUserId are required' });
      }
      const conversationId = await chatService.getOrCreateConversation(Number(myId), Number(targetUserId));
      return res.status(200).json({ success: true, data: { conversationId } });
    } catch (error) {
      console.error('[ConversationController] getOrCreatePrivateChat:', error);
      return res.status(500).json({ success: false, message: 'Error while creating private conversation' });
    }
  }

  async createGroupChat(req: Request, res: Response) {
    try {
      const { name, memberIds } = req.body;
      if (!name || !Array.isArray(memberIds) || memberIds.length < 2) {
        return res.status(400).json({ success: false, message: 'name and at least 2 memberIds are required' });
      }
      const group = await chatService.createGroupConversation(name, memberIds);
      return res.status(201).json({ success: true, data: group });
    } catch (error) {
      console.error('[ConversationController] createGroupChat:', error);
      return res.status(500).json({ success: false, message: 'Error while creating group conversation' });
    }
  }

  async getMessages(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const limit = Number(req.query.limit) || 50;
      const page = Number(req.query.page) || 1;
      const offset = (page - 1) * limit;

      const conversationId = Array.isArray(id) ? id[0] : id;
      const messages = await chatService.getConversationMessages(conversationId, limit, offset);
      return res.status(200).json({ success: true, data: messages });
    } catch (error) {
      console.error('[ConversationController] getMessages:', error);
      return res.status(500).json({ success: false, message: 'Error while fetching messages' });
    }
  }

  async searchUsers(req: Request, res: Response) {
    try {
      const keyword = String(req.query.keyword ?? '').trim();
      const excludeUserId = Number(req.query.excludeUserId ?? 0);

      if (keyword.length < 2) {
        return res.status(200).json({ success: true, data: [] });
      }

      const users = await chatService.searchUsersByKeyword(
        keyword,
        Number.isFinite(excludeUserId) && excludeUserId > 0 ? excludeUserId : undefined,
      );

      return res.status(200).json({ success: true, data: users });
    } catch (error) {
      console.error('[ConversationController] searchUsers:', error);
      return res.status(500).json({ success: false, message: 'Error while searching users' });
    }
  }

  async getGroupCandidates(req: Request, res: Response) {
    try {
      const userId = Number(req.query.userId ?? 0);
      const debug = String(req.query.debug ?? '') === '1';
      if (!Number.isFinite(userId) || userId <= 0) {
        return res.status(400).json({ success: false, message: 'userId is required' });
      }

      if (debug) {
        const data = await chatService.getGroupCandidateData(userId);
        return res.status(200).json({ success: true, data });
      }

      const users = await chatService.getGroupCandidateUsers(userId);
      return res.status(200).json({ success: true, data: users });
    } catch (error) {
      console.error('[ConversationController] getGroupCandidates:', error);
      return res.status(500).json({ success: false, message: 'Error while fetching group candidates' });
    }
  }
}

export default new ConversationController();
