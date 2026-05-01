import { BadRequestError, ForbiddenError, NotFoundError } from '../../core/handler/error.response.js';
import conversationMemberRepository from './conversationMember.repository.js';

export class ConversationMemberService {
  async updateOwnSettings(
    conversationId: number,
    requesterId: number,
    input: { nickname?: string | null; muteMode?: '1h' | '8h' | '24h' | 'forever' | 'unmute' },
  ) {
    if (!Number.isFinite(conversationId) || conversationId <= 0) {
      throw new BadRequestError('Invalid conversation id');
    }

    if (!Number.isFinite(requesterId) || requesterId <= 0) {
      throw new BadRequestError('Invalid requester id');
    }

    const member = await conversationMemberRepository.findMember(conversationId, requesterId);
    if (!member) {
      throw new ForbiddenError('You are not a member of this conversation');
    }

    if (input.nickname !== undefined) {
      const normalizedNickname = input.nickname?.trim() ?? '';
      member.nickname = normalizedNickname.length > 0 ? normalizedNickname.slice(0, 255) : null;
    }

    if (input.muteMode) {
      const now = Date.now();
      if (input.muteMode === 'unmute') {
        member.muted_until = null;
        member.muted_forever = false;
      } else if (input.muteMode === 'forever') {
        member.muted_until = null;
        member.muted_forever = true;
      } else {
        const hours = input.muteMode === '1h' ? 1 : input.muteMode === '8h' ? 8 : 24;
        member.muted_until = new Date(now + hours * 60 * 60 * 1000);
        member.muted_forever = false;
      }
    }

    const saved = await conversationMemberRepository.saveMember(member);
    return {
      conversation_id: Number(saved.conversation_id),
      user_id: Number(saved.user_id),
      nickname: saved.nickname,
      muted_until: saved.muted_until,
      muted_forever: Boolean(saved.muted_forever),
      is_muted: Boolean(saved.muted_forever || (saved.muted_until && saved.muted_until.getTime() > Date.now())),
    };
  }

  async getMembersByConversation(conversationId: number) {
    if (!Number.isFinite(conversationId) || conversationId <= 0) {
      throw new BadRequestError('Invalid conversation id');
    }

    return conversationMemberRepository.listMembers(conversationId);
  }

  async addMember(conversationId: number, userId: number, requesterId: number) {
    this.validateIds(conversationId, userId, requesterId);

    const conversation = await conversationMemberRepository.findConversationById(conversationId);
    if (!conversation) {
      throw new NotFoundError('Conversation not found');
    }

    const currentMembers = await conversationMemberRepository.listMembers(conversationId);
    const isGroup = Boolean(conversation.name) || currentMembers.length > 2;
    if (!isGroup) {
      throw new BadRequestError('Cannot add members to a private conversation');
    }

    const requesterIsMember = currentMembers.some((member: any) => Number(member.user_id) === requesterId);
    if (!requesterIsMember) {
      throw new ForbiddenError('You are not a member of this conversation');
    }

    const user = await conversationMemberRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const existingMember = currentMembers.some((member: any) => Number(member.user_id) === userId);
    if (existingMember) {
      throw new BadRequestError('User is already a member of this conversation');
    }

    await conversationMemberRepository.addMember(conversationId, userId);
    return this.getMembersByConversation(conversationId);
  }

  async removeMember(conversationId: number, userId: number, requesterId: number) {
    this.validateIds(conversationId, userId, requesterId);

    const conversation = await conversationMemberRepository.findConversationById(conversationId);
    if (!conversation) {
      throw new NotFoundError('Conversation not found');
    }

    const currentMembers = await conversationMemberRepository.listMembers(conversationId);
    const isGroup = Boolean(conversation.name) || currentMembers.length > 2;
    if (!isGroup) {
      throw new BadRequestError('Cannot remove members from a private conversation');
    }

    const requesterIsMember = currentMembers.some((member: any) => Number(member.user_id) === requesterId);
    if (!requesterIsMember) {
      throw new ForbiddenError('You are not a member of this conversation');
    }

    const targetIsMember = currentMembers.some((member: any) => Number(member.user_id) === userId);
    if (!targetIsMember) {
      throw new NotFoundError('Member not found in this conversation');
    }

    if (currentMembers.length <= 2) {
      throw new BadRequestError('Group must keep at least two members');
    }

    await conversationMemberRepository.removeMember(conversationId, userId);
    return this.getMembersByConversation(conversationId);
  }

  private validateIds(conversationId: number, userId: number, requesterId: number) {
    if (!Number.isFinite(conversationId) || conversationId <= 0) {
      throw new BadRequestError('Invalid conversation id');
    }

    if (!Number.isFinite(userId) || userId <= 0) {
      throw new BadRequestError('Invalid user id');
    }

    if (!Number.isFinite(requesterId) || requesterId <= 0) {
      throw new BadRequestError('Invalid requester id');
    }
  }
}
