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

  private parseDeletedForUserIds(raw: string | null | undefined): number[] {
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0);
    } catch {
      return [];
    }
  }

  private serializeDeletedForUserIds(ids: number[]): string {
    return JSON.stringify(Array.from(new Set(ids.filter((id) => Number.isFinite(id) && id > 0))));
  }

  private isMessageDeletedForUser(message: Message, userId: number): boolean {
    return this.parseDeletedForUserIds(message.deleted_for_user_ids).includes(userId);
  }

  private async assertConversationMember(conversationId: number, userId: number): Promise<void> {
    const membership = await this.memberRepo.findOne({
      where: {
        conversation_id: conversationId as any,
        user_id: userId as any,
      },
    });

    if (!membership) {
      throw new Error('You are not a member of this conversation');
    }
  }

  private isMembershipMuted(member: ConversationMember | null | undefined): boolean {
    if (!member) return false;
    if (member.muted_forever) return true;
    return Boolean(member.muted_until && member.muted_until.getTime() > Date.now());
  }

  private toMessageDto(message: Message, conversationId: string | number, viewerUserId?: number) {
    const hiddenForViewer =
      Number.isFinite(viewerUserId) && viewerUserId
        ? this.isMessageDeletedForUser(message, Number(viewerUserId))
        : false;

    if (hiddenForViewer) {
      return null;
    }

    return {
      id: String(message.id),
      conversation_id: String(conversationId),
      content: message.is_recalled ? 'Tin nhan da duoc thu hoi.' : message.content,
      sender_id: String(message.sender.id),
      sender_name: (message.sender as any)?.full_name || (message.sender as any)?.username || 'Unknown',
      created_at: message.created_at,
      is_recalled: Boolean(message.is_recalled),
    };
  }

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
      const currentMembership = await this.memberRepo.findOne({
        where: { conversation_id: convId as any, user_id: userId as any },
      });

      const candidateMessages = await this.messageRepo.find({
        where: { conversation: { id: convId } },
        relations: ['sender'],
        order: { created_at: 'DESC' },
        take: 20,
      });
      const lastVisibleMessage =
        candidateMessages.find((message) => !this.isMessageDeletedForUser(message, userId)) ?? null;

      const members = await this.memberRepo.find({
        where: { conversation_id: convId as any },
        relations: ['user'],
      });

      const isGroup = Boolean((conv as any).name) || members.length > 2;

      results.push({
        id: conv.id,
        name: currentMembership?.nickname || (conv as any).name || null,
        type: isGroup ? 'group' : 'private',
        nickname: currentMembership?.nickname ?? null,
        muted_until: currentMembership?.muted_until ?? null,
        muted_forever: Boolean(currentMembership?.muted_forever),
        is_muted: this.isMembershipMuted(currentMembership),
        members: members.map((m: any) => ({
          user_id: m.user_id,
          name: m.user?.full_name || m.user?.username || 'User',
          avatar: m.user?.avatar_url || null,
        })),
        lastMessage: lastVisibleMessage
          ? {
              id: lastVisibleMessage.id,
              conversation_id: String(convId),
              content: lastVisibleMessage.is_recalled ? 'Tin nhan da duoc thu hoi.' : lastVisibleMessage.content,
              sender_name:
                (lastVisibleMessage.sender as any)?.full_name ||
                (lastVisibleMessage.sender as any)?.username ||
                'User',
              created_at: lastVisibleMessage.created_at,
              is_recalled: Boolean(lastVisibleMessage.is_recalled),
            }
          : null,
      });
    }

    return results;
  }

  async saveMessage(conversationId: string, senderId: string, content: string) {
    await this.assertConversationMember(Number(conversationId), Number(senderId));

    const newMessage = this.messageRepo.create({
      conversation: { id: Number(conversationId) } as any,
      sender: { id: Number(senderId) } as any,
      content,
      deleted_for_user_ids: null,
      is_recalled: false,
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
      is_recalled: Boolean(fullMsg?.is_recalled),
    };
  }

  async getConversationMessages(conversationId: string, limit = 50, offset = 0, viewerUserId?: number) {
    const messages = await this.messageRepo.find({
      where: { conversation: { id: Number(conversationId) } },
      relations: ['sender'],
      order: { created_at: 'ASC' },
      take: limit,
      skip: offset,
    });

    return messages
      .map((message) => this.toMessageDto(message, conversationId, viewerUserId))
      .filter((message): message is NonNullable<typeof message> => Boolean(message));
  }

  async deleteMessageForSelf(messageId: string | number, userId: string | number) {
    const normalizedMessageId = Number(messageId);
    const normalizedUserId = Number(userId);

    if (!Number.isFinite(normalizedMessageId) || normalizedMessageId <= 0) {
      throw new Error('Invalid message id');
    }

    if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) {
      throw new Error('Invalid user id');
    }

    const message = await this.messageRepo.findOne({
      where: { id: normalizedMessageId },
      relations: ['sender', 'conversation'],
    });

    if (!message) {
      throw new Error('Message not found');
    }

    await this.assertConversationMember(Number((message.conversation as any).id), normalizedUserId);

    const deletedIds = this.parseDeletedForUserIds(message.deleted_for_user_ids);
    if (!deletedIds.includes(normalizedUserId)) {
      deletedIds.push(normalizedUserId);
      message.deleted_for_user_ids = this.serializeDeletedForUserIds(deletedIds);
      await this.messageRepo.save(message);
    }

    return {
      messageId: String(message.id),
      conversationId: String((message.conversation as any).id),
      userId: String(normalizedUserId),
      mode: 'self' as const,
    };
  }

  async recallMessageForEveryone(messageId: string | number, userId: string | number) {
    const normalizedMessageId = Number(messageId);
    const normalizedUserId = Number(userId);

    if (!Number.isFinite(normalizedMessageId) || normalizedMessageId <= 0) {
      throw new Error('Invalid message id');
    }

    if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) {
      throw new Error('Invalid user id');
    }

    const message = await this.messageRepo.findOne({
      where: { id: normalizedMessageId },
      relations: ['sender', 'conversation'],
    });

    if (!message) {
      throw new Error('Message not found');
    }

    if (Number((message.sender as any).id) !== normalizedUserId) {
      throw new Error('Only the sender can recall this message');
    }

    message.is_recalled = true;
    message.content = 'Tin nhan da duoc thu hoi.';
    message.media_url = null as any;
    await this.messageRepo.save(message);

    return {
      messageId: String(message.id),
      conversationId: String((message.conversation as any).id),
      mode: 'everyone' as const,
      content: message.content,
      is_recalled: true,
    };
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

  async getConversationMemberIds(conversationId: string | number): Promise<number[]> {
    const normalizedConversationId = Number(conversationId);
    if (!Number.isFinite(normalizedConversationId) || normalizedConversationId <= 0) return [];

    const members = await this.memberRepo.find({
      where: { conversation_id: normalizedConversationId as any },
      select: ['user_id'],
    });

    return members
      .map((member: any) => Number(member.user_id))
      .filter((id) => Number.isFinite(id) && id > 0);
  }

  async getConversationMembers(conversationId: string | number) {
    const normalizedConversationId = Number(conversationId);
    if (!Number.isFinite(normalizedConversationId) || normalizedConversationId <= 0) {
      return [];
    }

    const members = await this.memberRepo.find({
      where: { conversation_id: normalizedConversationId as any },
      relations: ['user'],
    });

    return members.map((member: any) => ({
      user_id: Number(member.user_id),
      name: member.user?.full_name || member.user?.username || 'User',
      avatar: member.user?.avatar_url || null,
    }));
  }

  async isConversationMutedForUser(conversationId: string | number, userId: number): Promise<boolean> {
    const normalizedConversationId = Number(conversationId);
    if (!Number.isFinite(normalizedConversationId) || normalizedConversationId <= 0) {
      return false;
    }

    const membership = await this.memberRepo.findOne({
      where: {
        conversation_id: normalizedConversationId as any,
        user_id: userId as any,
      },
    });

    return this.isMembershipMuted(membership);
  }
}

export default new ChatService();
