import { AppDataSource } from '../../data-source.js';
import { Comment } from '../../database/entity/comment.entity.js';
import type {
	CreateCommentRepositoryInputDTO,
	CreateCommentResultDTO,
} from './comment.dto.js';

class CommentRepository {
	public async createComment(input: CreateCommentRepositoryInputDTO): Promise<CreateCommentResultDTO> {
		return AppDataSource.transaction(async (manager) => {
			const commentRepo = manager.getRepository(Comment);

			const comment = commentRepo.create({
				user: { id: input.userId },
				post: { id: input.postId },
				parent: input.parentId ? ({ id: input.parentId } as Comment) : undefined,
				content: input.content,
			});

			const saved = await commentRepo.save(comment);

			await manager
				.createQueryBuilder()
				.update('posts')
				.set({ comment_count: () => 'comment_count + 1' })
				.where('id = :postId', { postId: input.postId })
				.execute();

			return {
				id: saved.id,
				post_id: input.postId,
				user_id: input.userId,
				content: saved.content,
				parent_id: input.parentId ?? null,
				created_at: saved.created_at,
			};
		});
	}
}

export default new CommentRepository();
