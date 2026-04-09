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
        const newConv = this.conversationRepo.create({ name } as any);
        const savedConv = (await this.conversationRepo.save(newConv)) as any;

        const members = memberIds.map(id => ({
            conversation_id: savedConv.id,
            user_id: id as any,
        }));
        await this.memberRepo.save(members);

        return savedConv;
    }

    /**
     * Lấy tất cả hội thoại mà User đang tham gia (kèm tin nhắn cuối)
     */
    async getUserConversations(userId: number): Promise<any[]> {
        const memberships = await this.memberRepo.find({
            where: { user_id: userId as any },
            select: ['conversation_id'],
        });

        const conversationIds = memberships.map((m: any) => m.conversation_id);
        if (conversationIds.length === 0) return [];

        const results = [];
        for (const convId of conversationIds) {
            const conv = await this.conversationRepo.findOne({ where: { id: convId } });
            if (!conv) continue;

            // Lấy tin nhắn cuối
            const lastMessage = await this.messageRepo.findOne({
                where: { conversation: { id: convId } },
                relations: ['sender'],
                order: { created_at: 'DESC' },
            });

            // Lấy danh sách thành viên
            const members = await this.memberRepo.find({
                where: { conversation_id: convId as any },
                relations: ['user'],
            });

            results.push({
                id: conv.id,
                name: (conv as any).name || null,
                type: (conv as any).name ? 'group' : 'private',
                members: members.map((m: any) => ({
                    user_id: m.user_id,
                    name: m.user?.name || m.user?.username || 'Người dùng',
                    avatar: m.user?.avatar || null,
                })),
                lastMessage: lastMessage
                    ? {
                          id: lastMessage.id,
                          content: lastMessage.content,
                          sender_name: (lastMessage.sender as any)?.name || 'Người dùng',
                          created_at: lastMessage.created_at,
                      }
                    : null,
            });
        }

        return results;
    }

    /**
     * LƯU TIN NHẮN
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
            relations: ['sender'],
        });

        return {
            id: fullMsg?.id.toString(),
            conversation_id: conversationId,
            sender_id: senderId,
            sender_name: (fullMsg?.sender as any)?.name || (fullMsg?.sender as any)?.username || 'Người dùng',
            content: fullMsg?.content,
            created_at: fullMsg?.created_at,
        };
    }

    /**
     * Lấy lịch sử tin nhắn (có phân trang)
     */
    async getConversationMessages(conversationId: string, limit = 50, offset = 0) {
        const messages = await this.messageRepo.find({
            where: { conversation: { id: Number(conversationId) } },
            relations: ['sender'],
            order: { created_at: 'ASC' },
            take: limit,
            skip: offset,
        });

        return messages.map(m => ({
            id: m.id.toString(),
            content: m.content,
            sender_id: m.sender.id.toString(),
            sender_name: (m.sender as any)?.name || (m.sender as any)?.username || 'Unknown',
            created_at: m.created_at,
        }));
    }
}

export default new ChatService();