import { Request, Response } from 'express';
import chatService from './conversation.service.js';

class ConversationController {
    /**
     * GET /api/v1/conversations/user/:userId
     * Lấy danh sách tất cả conversation của user (bao gồm 1-1 và nhóm)
     */
    async getUserConversations(req: Request, res: Response) {
        try {
            const { userId } = req.params;
            const conversations = await chatService.getUserConversations(Number(userId));
            return res.status(200).json({ success: true, data: conversations });
        } catch (error) {
            console.error('[ConversationController] getUserConversations:', error);
            return res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách hội thoại' });
        }
    }

    /**
     * POST /api/v1/conversations/private
     * Body: { myId: number, targetUserId: number }
     * Tạo hoặc lấy cuộc hội thoại 1-1
     */
    async getOrCreatePrivateChat(req: Request, res: Response) {
        try {
            const { myId, targetUserId } = req.body;
            if (!myId || !targetUserId) {
                return res.status(400).json({ success: false, message: 'Thiếu myId hoặc targetUserId' });
            }
            const conversationId = await chatService.getOrCreateConversation(Number(myId), Number(targetUserId));
            return res.status(200).json({ success: true, data: { conversationId } });
        } catch (error) {
            console.error('[ConversationController] getOrCreatePrivateChat:', error);
            return res.status(500).json({ success: false, message: 'Lỗi khi tạo hội thoại' });
        }
    }

    /**
     * POST /api/v1/conversations/group
     * Body: { name: string, memberIds: number[] }
     * Tạo nhóm chat mới
     */
    async createGroupChat(req: Request, res: Response) {
        try {
            const { name, memberIds } = req.body;
            if (!name || !memberIds || !Array.isArray(memberIds) || memberIds.length < 2) {
                return res.status(400).json({ success: false, message: 'Thiếu name hoặc memberIds (cần ít nhất 2 người)' });
            }
            const group = await chatService.createGroupConversation(name, memberIds);
            return res.status(201).json({ success: true, data: group });
        } catch (error) {
            console.error('[ConversationController] createGroupChat:', error);
            return res.status(500).json({ success: false, message: 'Lỗi khi tạo nhóm' });
        }
    }

    /**
     * GET /api/v1/conversations/:id/messages?limit=50&page=1
     * Lấy lịch sử tin nhắn của một cuộc hội thoại (có phân trang)
     */
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
            return res.status(500).json({ success: false, message: 'Lỗi khi lấy tin nhắn' });
        }
    }
}

export default new ConversationController();