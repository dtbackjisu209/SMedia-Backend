import { AppDataSource } from '../../data-source.js';
import type {
	CreatePostWithMediaInputDTO,
	FeedAuthorDTO,
	FeedPostCacheDataDTO,
	PostDetailDTO,
} from './post.dto.js';
import { NotFoundError } from '../../core/handler/error.response.js';
import { Post } from '../../database/entity/post.entity.js';
import { PostMedia } from '../../database/entity/postMedia.entity.js';
import { User } from '../../database/entity/user.entity.js';

class PostRepository {
	public async createPostWithMedia(payload: CreatePostWithMediaInputDTO): Promise<Post> {
		const userRepo = AppDataSource.getRepository(User);
		const postRepo = AppDataSource.getRepository(Post);
		const postMediaRepo = AppDataSource.getRepository(PostMedia);

		const user = await userRepo.findOneBy({ id: payload.userId });
		if (!user) {
			throw new NotFoundError(`Post owner not found with user id ${payload.userId}`);
		}

		const post = new Post();
		post.user = user;
		post.caption = payload.caption ?? null;
		post.location = payload.location ?? null;

		const savedPost = await postRepo.save(post);

		if (payload.media.length > 0) {
			const mediaRows = payload.media.map((item) => {
				const media = new PostMedia();
				media.post = savedPost;
				media.media_url = item.media_url;
				media.media_type = item.media_type;
				media.position = item.position;
				return media;
			});

			await postMediaRepo.save(mediaRows);
		}

		return savedPost;
	}

	public async getFeedAuthorByUserId(userId: number): Promise<FeedAuthorDTO> {
		const row = await AppDataSource.getRepository(User)
			.createQueryBuilder('user')
			.select('user.id', 'id')
			.addSelect('user.username', 'username')
			.addSelect('user.full_name', 'full_name')
			.addSelect('user.avatar_url', 'avatar_url')
			.where('user.id = :userId', { userId })
			.getRawOne<{
				id: string;
				username: string;
				full_name: string | null;
				avatar_url: string | null;
			}>();

		if (!row) {
			throw new NotFoundError(`Post owner not found with user id ${userId}`);
		}

		return {
			id: Number(row.id),
			username: row.username,
			fullName: row.full_name,
			avatarUrl: row.avatar_url,
		};
	}

	public async getPostDetailById(postId: number): Promise<PostDetailDTO> {
		const postRow = await AppDataSource.getRepository(Post)
			.createQueryBuilder('post')
			.innerJoin('post.user', 'user')
			.select('post.id', 'post_id')
			.addSelect('post.caption', 'post_caption')
			.addSelect('post.location', 'post_location')
			.addSelect('post.created_at', 'post_created_at')
			.addSelect('post.like_count', 'post_like_count')
			.addSelect('post.comment_count', 'post_comment_count')
			.addSelect('user.id', 'author_id')
			.addSelect('user.username', 'author_username')
			.addSelect('user.full_name', 'author_full_name')
			.addSelect('user.avatar_url', 'author_avatar_url')
			.where('post.id = :postId', { postId })
			.getRawOne<{
				post_id: string;
				post_caption: string | null;
				post_location: string | null;
				post_created_at: Date;
				post_like_count: string;
				post_comment_count: string;
				author_id: string;
				author_username: string;
				author_full_name: string | null;
				author_avatar_url: string | null;
			}>();

		if (!postRow) {
			throw new NotFoundError(`Post not found with id ${postId}`);
		}

		const mediaRows = await AppDataSource.getRepository(PostMedia)
			.createQueryBuilder('media')
			.select('media.media_url', 'media_url')
			.addSelect('media.media_type', 'media_type')
			.addSelect('media.position', 'position')
			.where('media.post_id = :postId', { postId })
			.orderBy('media.position', 'ASC')
			.getRawMany<{
				media_url: string;
				media_type: 'image' | 'video';
				position: number;
			}>();

		return {
			id: Number(postRow.post_id),
			caption: postRow.post_caption,
			location: postRow.post_location,
			created_at: new Date(postRow.post_created_at),
			author: {
				id: Number(postRow.author_id),
				username: postRow.author_username,
				fullName: postRow.author_full_name,
				avatarUrl: postRow.author_avatar_url,
			},
			media: mediaRows.map((row) => ({
				mediaUrl: row.media_url,
				mediaType: row.media_type,
				position: Number(row.position),
			})),
			like_count: Number(postRow.post_like_count) || 0,
			comment_count: Number(postRow.post_comment_count) || 0,
		};
	}

	public async getFeedCacheDataByPostIds(postIds: number[]): Promise<FeedPostCacheDataDTO[]> {
		if (postIds.length === 0) {
			return [];
		}

		const postRows = await AppDataSource.getRepository(Post)
			.createQueryBuilder('post')
			.innerJoin('post.user', 'user')
			.select('post.id', 'post_id')
			.addSelect('post.caption', 'post_caption')
			.addSelect('post.location', 'post_location')
			.addSelect('post.created_at', 'post_created_at')
			.addSelect('post.like_count', 'post_like_count')
			.addSelect('post.comment_count', 'post_comment_count')
			.addSelect('user.id', 'author_id')
			.addSelect('user.username', 'author_username')
			.addSelect('user.full_name', 'author_full_name')
			.addSelect('user.avatar_url', 'author_avatar_url')
			.where('post.id IN (:...postIds)', { postIds })
			.getRawMany<{
				post_id: string;
				post_caption: string | null;
				post_location: string | null;
				post_created_at: Date;
				post_like_count: string;
				post_comment_count: string;
				author_id: string;
				author_username: string;
				author_full_name: string | null;
				author_avatar_url: string | null;
			}>();

		if (postRows.length === 0) {
			return [];
		}

		const mediaRows = await AppDataSource.getRepository(PostMedia)
			.createQueryBuilder('media')
			.select('media.post_id', 'post_id')
			.addSelect('media.media_url', 'media_url')
			.addSelect('media.position', 'position')
			.where('media.post_id IN (:...postIds)', { postIds })
			.orderBy('media.post_id', 'ASC')
			.addOrderBy('media.position', 'ASC')
			.getRawMany<{
				post_id: string;
				media_url: string;
				position: number;
			}>();

		const mediaByPostId = new Map<number, { thumbnail: string; mediaCount: number }>();
		for (const row of mediaRows) {
			const postId = Number(row.post_id);
			if (!Number.isFinite(postId)) {
				continue;
			}

			const existing = mediaByPostId.get(postId);
			if (!existing) {
				mediaByPostId.set(postId, {
					thumbnail: row.media_url,
					mediaCount: 1,
				});
				continue;
			}

			existing.mediaCount += 1;
		}

		return postRows.map((row) => {
			const postId = Number(row.post_id);
			const media = mediaByPostId.get(postId);

			return {
				postId,
				caption: row.post_caption,
				location: row.post_location,
				likeCount: Number(row.post_like_count) || 0,
				commentCount: Number(row.post_comment_count) || 0,
				createdAt: new Date(row.post_created_at),
				tags: [],
				thumbnail: media?.thumbnail ?? '',
				mediaCount: media?.mediaCount ?? 0,
				author: {
					id: Number(row.author_id),
					username: row.author_username,
					fullName: row.author_full_name,
					avatarUrl: row.author_avatar_url,
				},
			};
		});
	}
}

export default new PostRepository();

