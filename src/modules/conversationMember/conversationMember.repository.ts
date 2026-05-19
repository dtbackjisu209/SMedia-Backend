import { AppDataSource } from '../../data-source.js';
import { Conversation } from '../../database/entity/conversation.entity.js';
import { ConversationMember } from '../../database/entity/conversationMember.entity.js';
import { User } from '../../database/entity/user.entity.js';

class ConversationMemberRepository {
  private conversationRepo = AppDataSource.getRepository(Conversation);
  private memberRepo = AppDataSource.getRepository(ConversationMember);
  private userRepo = AppDataSource.getRepository(User);

  findConversationById(conversationId: number) {
    return this.conversationRepo.findOne({ where: { id: conversationId } });
  }

  findUserById(userId: number) {
    return this.userRepo.findOne({ where: { id: userId } });
  }

  findMember(conversationId: number, userId: number) {
    return this.memberRepo.findOne({
      where: {
        conversation_id: conversationId as any,
        user_id: userId as any,
      },
      relations: ['user'],
    });
  }

  listMembers(conversationId: number) {
    return this.memberRepo.find({
      where: { conversation_id: conversationId as any },
      relations: ['user'],
    });
  }

  async addMember(conversationId: number, userId: number) {
    const created = this.memberRepo.create({
      conversation_id: conversationId,
      user_id: userId as any,
      nickname: null,
      muted_until: null,
      muted_forever: false,
    });

    return this.memberRepo.save(created);
  }

  async saveMember(member: ConversationMember) {
    return this.memberRepo.save(member);
  }

  removeMember(conversationId: number, userId: number) {
    return this.memberRepo.delete({
      conversation_id: conversationId,
      user_id: userId as any,
    });
  }
}

export default new ConversationMemberRepository();
