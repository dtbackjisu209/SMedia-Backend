import { AppDataSource } from '../../data-source.js';
import { Conversation } from '../../database/entity/conversation.entity.js';
import { ConversationMember } from '../../database/entity/conversationMember.entity.js';
import { Message } from '../../database/entity/message.entity.js';

export class ChatService {
	private messageRepo = AppDataSource.getRepository(Message);
	private conversationRepo = AppDataSource.getRepository(Conversation);
	private memberRepo = AppDataSource.getRepository(ConversationMember);

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
			{ conversation_id: savedConv.id, user_id: user1Id as never },
			{ conversation_id: savedConv.id, user_id: user2Id as never },
		]);

		return savedConv.id.toString();
	}

	async saveMessage(conversationId: string, senderId: string, content: string) {
		const newMessage = this.messageRepo.create({
			conversation: { id: Number(conversationId) } as never,
			sender: { id: Number(senderId) } as never,
			content,
		});

		const savedMsg = await this.messageRepo.save(newMessage);

		return {
			id: savedMsg.id.toString(),
			conversation_id: conversationId,
			sender_id: senderId,
			content: savedMsg.content,
			created_at: savedMsg.created_at,
		};
	}

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
			created_at: m.created_at,
		}));
	}
}

export default new ChatService();
