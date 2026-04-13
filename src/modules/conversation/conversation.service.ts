import { AppDataSource } from '../../data-source.js';
import { Conversation } from '../../database/entity/conversation.entity.js';
import { ConversationMember } from '../../database/entity/conversationMember.entity.js';
import { Message } from '../../database/entity/message.entity.js';
import { User } from '../../database/entity/user.entity.js';
import { In } from 'typeorm';
import { getFollowerIdsByUserId, getFollowingIdsByUserId } from '../follow/follow.repository.js';

export class ChatService {
  private messageRepo = AppDataSource.getRepository(Message);
  private conversationRepo = AppDataSource.getRepository(Conversation);
  private memberRepo = AppDataSource.getRepository(ConversationMember);
  private userRepo = AppDataSource.getRepository(User);

  async getOrCreateConversation(user1Id: number, user2Id: number): Promise<string> {
    if (!Number.isFinite(user1Id) || !Number.isFinite(user2Id)) {
      throw new Error('Invalid user id');
    }

    if (user1Id === user2Id) {
      throw new Error('Cannot create private chat with yourself');
    }

    const result = await AppDataSource.query(
      `
      SELECT cm.conversation_id
      FROM conversation_members cm
      GROUP BY cm.conversation_id
      HAVING COUNT(*) = 2
         AND SUM(CASE WHEN cm.user_id IN (?, ?) THEN 1 ELSE 0 END) = 2
      `,
      [user1Id, user2Id],
    );

    if (result.length > 0) {
      return String(result[0].conversation_id);
    }

    const newConv = this.conversationRepo.create();
    const savedConv = await this.conversationRepo.save(newConv);

    await this.memberRepo.save([
      { conversation_id: savedConv.id, user_id: user1Id as any },
      { conversation_id: savedConv.id, user_id: user2Id as any },
    ]);

    return String(savedConv.id);
  }

  async createGroupConversation(name: string, memberIds: number[]): Promise<Conversation> {
    const newConv = this.conversationRepo.create({ name } as any);
    const savedConv = (await this.conversationRepo.save(newConv)) as any;

    const uniqueMembers = Array.from(new Set(memberIds));
    const members = uniqueMembers.map((id) => ({
      conversation_id: savedConv.id,
      user_id: id as any,
    }));
    await this.memberRepo.save(members);

    return savedConv;
  }

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

      const lastMessage = await this.messageRepo.findOne({
        where: { conversation: { id: convId } },
        relations: ['sender'],
        order: { created_at: 'DESC' },
      });

      const members = await this.memberRepo.find({
        where: { conversation_id: convId as any },
        relations: ['user'],
      });

      const isGroup = Boolean((conv as any).name) || members.length > 2;

      results.push({
        id: conv.id,
        name: (conv as any).name || null,
        type: isGroup ? 'group' : 'private',
        members: members.map((m: any) => ({
          user_id: m.user_id,
          name: m.user?.full_name || m.user?.username || 'User',
          avatar: m.user?.avatar_url || null,
        })),
        lastMessage: lastMessage
          ? {
              id: lastMessage.id,
              conversation_id: String(convId),
              content: lastMessage.content,
              sender_name:
                (lastMessage.sender as any)?.full_name ||
                (lastMessage.sender as any)?.username ||
                'User',
              created_at: lastMessage.created_at,
            }
          : null,
      });
    }

    return results;
  }

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
      id: String(fullMsg?.id ?? ''),
      conversation_id: String(conversationId),
      sender_id: String(senderId),
      sender_name:
        (fullMsg?.sender as any)?.full_name ||
        (fullMsg?.sender as any)?.username ||
        'User',
      content: fullMsg?.content,
      created_at: fullMsg?.created_at,
    };
  }

  async getConversationMessages(conversationId: string, limit = 50, offset = 0) {
    const messages = await this.messageRepo.find({
      where: { conversation: { id: Number(conversationId) } },
      relations: ['sender'],
      order: { created_at: 'ASC' },
      take: limit,
      skip: offset,
    });

    return messages.map((m) => ({
      id: String(m.id),
      conversation_id: String(conversationId),
      content: m.content,
      sender_id: String(m.sender.id),
      sender_name: (m.sender as any)?.full_name || (m.sender as any)?.username || 'Unknown',
      created_at: m.created_at,
    }));
  }

  async searchUsersByKeyword(keyword: string, excludeUserId?: number) {
    const q = keyword.trim();
    if (q.length < 2) return [];

    const query = this.userRepo
      .createQueryBuilder('user')
      .where('LOWER(user.username) LIKE :keyword OR LOWER(user.full_name) LIKE :keyword', {
        keyword: `%${q.toLowerCase()}%`,
      })
      .orderBy('user.created_at', 'DESC')
      .limit(10);

    if (excludeUserId && Number.isFinite(excludeUserId)) {
      query.andWhere('user.id != :excludeUserId', { excludeUserId });
    }

    const users = await query.getMany();

    return users.map((user) => ({
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
    }));
  }

  async getGroupCandidateUsers(userId: number) {
    const data = await this.getGroupCandidateData(userId);
    return data.users;
  }

  async getGroupCandidateData(userId: number) {
    if (!Number.isFinite(userId) || userId <= 0) {
      return { users: [], meta: { followerIds: [], followingIds: [], conversationIds: [], chattedUserIds: [] } };
    }

    const [followerIds, followingIds] = await Promise.all([
      getFollowerIdsByUserId(userId),
      getFollowingIdsByUserId(userId),
    ]);

    const memberships = await this.memberRepo.find({
      where: { user_id: userId as any },
      select: ['conversation_id'],
    });
    const conversationIds = memberships.map((m: any) => Number(m.conversation_id)).filter(Number.isFinite);

    let chattedUserIds: number[] = [];
    if (conversationIds.length > 0) {
      const members = await this.memberRepo.find({
        where: { conversation_id: In(conversationIds) as any },
        relations: ['user'],
      });
      chattedUserIds = members
        .map((m: any) => Number(m.user_id))
        .filter((id) => Number.isFinite(id) && id !== userId);
    }

    const combined = Array.from(
      new Set([...followerIds, ...followingIds, ...chattedUserIds].filter((id) => id !== userId)),
    );
    if (combined.length === 0) {
      return {
        users: [],
        meta: {
          followerIds,
          followingIds,
          conversationIds,
          chattedUserIds,
        },
      };
    }

    const users = await this.userRepo.find({ where: { id: In(combined) as any } });

    const userMap = new Map<number, User>();
    users.forEach((u) => userMap.set(u.id as any, u));

    const mapped = combined
      .map((id) => userMap.get(id))
      .filter((u): u is User => Boolean(u))
      .map((user) => ({
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
      }));

    return {
      users: mapped,
      meta: {
        followerIds,
        followingIds,
        conversationIds,
        chattedUserIds,
      },
    };
  }
}

export default new ChatService();
