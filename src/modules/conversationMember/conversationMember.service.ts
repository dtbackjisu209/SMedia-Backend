import { AppDataSource } from '../../data-source.js';
import { ConversationMember } from '../../database/entity/conversationMember.entity.js';

export class ConversationMemberService {
    private memberRepo = AppDataSource.getRepository(ConversationMember);

    // 1. Lấy danh sách thành viên của một phòng chat
    async getMembersByConversation(conversationId: number) {
        return await this.memberRepo.find({
            where: { conversation_id: conversationId as any },
            relations: ['user'] // Để lấy luôn tên, avatar của từng thành viên
        });
    }

    // 2. Thêm thành viên mới vào nhóm đã có
    async addMember(conversationId: number, userId: number) {
        const newMember = this.memberRepo.create({
            conversation_id: conversationId,
            user_id: userId as any
        });
        return await this.memberRepo.save(newMember);
    }

    // 3. Xóa thành viên hoặc Rời nhóm
    async removeMember(conversationId: number, userId: number) {
        return await this.memberRepo.delete({
            conversation_id: conversationId,
            user_id: userId as any
        });
    }
}