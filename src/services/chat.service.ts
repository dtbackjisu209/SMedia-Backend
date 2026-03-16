import { AppDataSource } from "../data-source.js";
import { Message } from "../models/message.model.js";
import { Conversation } from "../models/conversation.model.js";
import { ConversationMember } from "../models/conversationMember.model.js";

export class ChatService {
    private messageRepo = AppDataSource.getRepository(Message);
    private conversationRepo = AppDataSource.getRepository(Conversation);
    private memberRepo = AppDataSource.getRepository(ConversationMember);

    /**
     * Tìm hoặc tạo mới một cuộc hội thoại 1-1 giữa 2 người dùng
     */
    async getOrCreateConversation(user1Id: number, user2Id: number): Promise<string> {
        // Tìm conversation ID mà cả 2 user đều tham gia
        const result = await AppDataSource.query(`
            SELECT conversation_id 
            FROM conversation_members 
            WHERE user_id IN (?, ?)
            GROUP BY conversation_id 
            HAVING COUNT(DISTINCT user_id) = 2
        `, [user1Id, user2Id]);

        if (result.length > 0) {
            return result[0].conversation_id.toString();
        }

        // Nếu chưa có, tạo mới Conversation
        const newConv = this.conversationRepo.create();
        const savedConv = await this.conversationRepo.save(newConv);

        // Thêm 2 thành viên vào cuộc hội thoại
        await this.memberRepo.save([
            { conversation_id: savedConv.id, user_id: user1Id as any },
            { conversation_id: savedConv.id, user_id: user2Id as any }
        ]);

        return savedConv.id.toString();
    }

    /**
     * Lưu tin nhắn vào Database
     */
    async saveMessage(conversationId: string, senderId: string, content: string) {
        const newMessage = this.messageRepo.create({
            conversation: { id: Number(conversationId) } as any,
            sender: { id: Number(senderId) } as any,
            content: content
        });

        const savedMsg = await this.messageRepo.save(newMessage);

        // Trả về dữ liệu đã format để gửi qua Socket (Tránh lỗi BigInt)
        return {
            id: savedMsg.id.toString(),
            conversation_id: conversationId,
            sender_id: senderId,
            content: savedMsg.content,
            created_at: savedMsg.created_at
        };
    }

    /**
     * Lấy lịch sử tin nhắn của một cuộc hội thoại
     */
    async getConversationMessages(conversationId: string, limit: number = 50) {
        const messages = await this.messageRepo.find({
            where: { conversation: { id: Number(conversationId) } },
            relations: ["sender"],
            order: { created_at: "ASC" },
            take: limit
        });

        return messages.map(m => ({
            id: m.id.toString(),
            content: m.content,
            sender_id: m.sender.id.toString(),
            created_at: m.created_at
        }));
    }
}