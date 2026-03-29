import { AppDataSource } from '../../data-source.js';
import { Conversation } from '../../database/entity/conversation.entity.js';
import { ConversationMember } from '../../database/entity/conversationMember.entity.js';
import { Message } from '../../database/entity/message.entity.js';

export class ChatService {
    private messageRepo = AppDataSource.getRepository(Message);
    private conversationRepo = AppDataSource.getRepository(Conversation);
    private memberRepo = AppDataSource.getRepository(ConversationMember);

    /**
     * CHAT 1-1: Tìm hoặc tạo cuộc hội thoại giữa 2 người
     */
    async getOrCreateConversation(user1Id: number, user2Id: number): Promise<string> {
        const result = await AppDataSource.query(
            `
            SELECT conversation_id
            FROM conversation_members
            WHERE user_id IN (?, ?)
            GROUP BY conversation_id
            HAVING COUNT(DISTINCT user_id) = 2
            `,
            [user1Id, user2Id],
        );

        if (result.length > 0) {
            return result[0].conversation_id.toString();
        }

        const newConv = this.conversationRepo.create();
        const savedConv = await this.conversationRepo.save(newConv);

        await this.memberRepo.save([
            { conversation_id: savedConv.id, user_id: user1Id as any },
            { conversation_id: savedConv.id, user_id: user2Id as any },
        ]);

        return savedConv.id.toString();
    }

    /**
     * CHAT NHÓM: Tạo hội thoại nhóm
     */
    async createGroupConversation(name: string, memberIds: number[]): Promise<Conversation> {
        const newConv = this.conversationRepo.create({
            name: name 
        } as any);
        
        const savedConv = (await this.conversationRepo.save(newConv)) as any;

        const members = memberIds.map(id => ({
            conversation_id: savedConv.id,
            user_id: id as any
        }));
        await this.memberRepo.save(members);

        return savedConv;
    }

    /**
     * Lấy tất cả hội thoại mà User đang tham gia
     */
    async getUserConversations(userId: number): Promise<any[]> {
        return await this.memberRepo.find({
            where: { user_id: userId as any },
            select: ['conversation_id']
        });
    }

    /**
     * LƯU TIN NHẮN (Đã gộp và tối ưu)
     */
    async saveMessage(conversationId: string, senderId: string, content: string) {
        const newMessage = this.messageRepo.create({
            conversation: { id: Number(conversationId) } as any,
            sender: { id: Number(senderId) } as any,
            content,
        });

        const savedMsg = await this.messageRepo.save(newMessage);

        const fullMsg = await this.messageRepo.findOne({
            where: { id: savedMsg.id },
            relations: ['sender'] 
        });

        return {
            id: fullMsg?.id.toString(),
            conversation_id: conversationId,
            sender_id: senderId,
    		sender_name: (fullMsg?.sender as any)?.name || (fullMsg?.sender as any)?.username || "Người dùng", 
            content: fullMsg?.content,
            created_at: fullMsg?.created_at,
        };
    }

    /**
     * Lấy lịch sử tin nhắn
     */
    async getConversationMessages(conversationId: string, limit = 50) {
        const messages = await this.messageRepo.find({
            where: { conversation: { id: Number(conversationId) } },
            relations: ['sender'],
            order: { created_at: 'ASC' },
            take: limit,
        });

        return messages.map((m) => ({
            id: m.id.toString(),
            content: m.content,
            sender_id: m.sender.id.toString(),
    	sender_name: (m.sender as any)?.name || (m.sender as any)?.username || "Unknown",
            created_at: m.created_at,
        }));
    }
}

export default new ChatService();