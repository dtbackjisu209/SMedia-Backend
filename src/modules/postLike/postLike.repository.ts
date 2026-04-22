import { AppDataSource } from '../../data-source.js';
import { PostLike } from '../../database/entity/postLike.entity.js';

class PostLikeRepository {
	public async likePost(userId: number, postId: number): Promise<boolean> {
		return AppDataSource.transaction(async (manager) => {
			const existing = await manager.getRepository(PostLike).findOneBy({
				user_id: userId,
				post_id: postId,
			});

			if (existing) {
				return false;
			}

			await manager.getRepository(PostLike).insert({
				user_id: userId,
				post_id: postId,
			});

			await manager
				.createQueryBuilder()
				.update('posts')
				.set({ like_count: () => 'like_count + 1' })
				.where('id = :postId', { postId })
				.execute();

			return true;
		});
	}

	public async unlikePost(userId: number, postId: number): Promise<boolean> {
		return AppDataSource.transaction(async (manager) => {
			const existing = await manager.getRepository(PostLike).findOneBy({
				user_id: userId,
				post_id: postId,
			});

			if (!existing) {
				return false;
			}

			await manager.getRepository(PostLike).delete({
				user_id: userId,
				post_id: postId,
			});

			await manager
				.createQueryBuilder()
				.update('posts')
				.set({
					like_count: () => 'CASE WHEN like_count > 0 THEN like_count - 1 ELSE 0 END',
				})
				.where('id = :postId', { postId })
				.execute();

			return true;
		});
	}
}

export default new PostLikeRepository();
