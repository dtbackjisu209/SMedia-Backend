import { AppDataSource } from '../../data-source.js';
import { Comment } from '../../database/entity/comment.entity.js';
import type {
	CommentItemDTO,
	CreateCommentRepositoryInputDTO,
	CreateCommentResultDTO,
} from './comment.dto.js';

const MAX_LIMIT = 50;

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

	public async deleteComment(
		commentId: number,
		userId: number,
	): Promise<{ deleted: boolean; postId: number | null }> {
		return AppDataSource.transaction(async (manager) => {
			const commentRepo = manager.getRepository(Comment);

			const comment = await commentRepo.findOne({
				where: { id: commentId },
				relations: ['post', 'user'],
			});

			if (!comment) {
				return { deleted: false, postId: null };
			}

			if (Number(comment.user.id) !== userId) {
				return { deleted: false, postId: Number(comment.post.id) };
			}

			const postId = Number(comment.post.id);
			await commentRepo.delete({ id: commentId });

			await manager
				.createQueryBuilder()
				.update('posts')
				.set({
					comment_count: () => 'CASE WHEN comment_count > 0 THEN comment_count - 1 ELSE 0 END',
				})
				.where('id = :postId', { postId })
				.execute();

			return { deleted: true, postId };
		});
	}

	public async getCommentsByPost(
		postId: number,
		limit: number,
		cursor?: number,
	): Promise<CommentItemDTO[]> {
		const safeLimit = Math.min(limit, MAX_LIMIT);

		const qb = AppDataSource.getRepository(Comment)
			.createQueryBuilder('c')
			.innerJoin('c.user', 'u')
			.innerJoin('c.post', 'p')
			.leftJoin('c.parent', 'parent')
			.select([
				'c.id            AS id',
				'p.id            AS post_id',
				'u.id            AS user_id',
				'u.username      AS username',
				'u.full_name     AS full_name',
				'u.avatar_url    AS avatar_url',
				'c.content       AS content',
				'parent.id       AS parent_id',
				'c.created_at    AS created_at',
			])
			.where('p.id = :postId', { postId })
			.orderBy('c.id', 'ASC')
			.limit(safeLimit);

		if (cursor !== undefined) {
			qb.andWhere('c.id > :cursor', { cursor });
		}

		const rows = await qb.getRawMany<{
			id: string;
			post_id: string;
			user_id: string;
			username: string;
			full_name: string;
			avatar_url: string | null;
			content: string;
			parent_id: string | null;
			created_at: Date;
		}>();

		return rows.map((r) => ({
			id: Number(r.id),
			post_id: Number(r.post_id),
			user_id: Number(r.user_id),
			username: r.username,
			full_name: r.full_name,
			avatar_url: r.avatar_url ?? null,
			content: r.content,
			parent_id: r.parent_id !== null ? Number(r.parent_id) : null,
			created_at: r.created_at,
		}));
	}
}

export default new CommentRepository();
