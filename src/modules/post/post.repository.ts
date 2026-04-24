import { AppDataSource } from '../../data-source.js';
import type {
	CreatePostWithMediaInputDTO,
	FeedAuthorDTO,
	FeedPostCacheDataDTO,
	PostDeleteCandidateDTO,
	PostDetailDTO,
} from './post.dto.js';
import { NotFoundError } from '../../core/handler/error.response.js';
import type { EntityManager } from 'typeorm';
import { Comment } from '../../database/entity/comment.entity.js';
import { Hashtag } from '../../database/entity/hashtag.entity.js';
import { Post } from '../../database/entity/post.entity.js';
import { PostHashtag } from '../../database/entity/postHashtag.entity.js';
import { PostLike } from '../../database/entity/postLike.entity.js';
import { PostMedia } from '../../database/entity/postMedia.entity.js';
import { User } from '../../database/entity/user.entity.js';

class PostRepository {
	public async getPostOwnerId(postId: number): Promise<number | null> {
		const row = await AppDataSource.getRepository(Post)
			.createQueryBuilder('post')
			.select('post.user_id', 'author_id')
			.where('post.id = :postId', { postId })
			.getRawOne<{ author_id: string }>();

		if (!row) {
			return null;
		}

		const authorId = Number(row.author_id);
		return Number.isFinite(authorId) ? authorId : null;
	}

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

	public async getTagsByPostId(postId: number): Promise<string[]> {
		const rows = await AppDataSource.getRepository(Hashtag)
			.createQueryBuilder('hashtag')
			.innerJoin('post_hashtags', 'postHashtag', 'postHashtag.hashtag_id = hashtag.id')
			.select('hashtag.name', 'name')
			.where('postHashtag.post_id = :postId', { postId })
			.getRawMany<{ name: string }>();

		return rows
			.map((row) => row.name.trim().toLowerCase())
			.filter((tag) => tag.length > 0);
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

		const tagRows = await AppDataSource.getRepository(PostHashtag)
			.createQueryBuilder('postHashtag')
			.innerJoin(Hashtag, 'hashtag', 'hashtag.id = postHashtag.hashtag_id')
			.select('postHashtag.post_id', 'post_id')
			.addSelect('hashtag.name', 'tag_name')
			.where('postHashtag.post_id IN (:...postIds)', { postIds })
			.getRawMany<{
				post_id: string;
				tag_name: string;
			}>();

		const tagsByPostId = new Map<number, string[]>();
		for (const row of tagRows) {
			const postId = Number(row.post_id);
			if (!Number.isFinite(postId)) {
				continue;
			}

			const normalizedTag = row.tag_name.trim().toLowerCase();
			if (!normalizedTag) {
				continue;
			}

			const existing = tagsByPostId.get(postId) ?? [];
			if (!existing.includes(normalizedTag)) {
				existing.push(normalizedTag);
				tagsByPostId.set(postId, existing);
			}
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
				tags: tagsByPostId.get(postId) ?? [],
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

	public async updatePostMetadataAndTags(
		postId: number,
		payload: {
			caption: string | null;
			location: string | null;
			tags: string[];
		},
		manager?: EntityManager,
	): Promise<boolean> {
		const repo = manager ?? AppDataSource.manager;

		const updateResult = await repo
			.getRepository(Post)
			.createQueryBuilder()
			.update(Post)
			.set({
				caption: payload.caption,
				location: payload.location,
				updated_at: () => 'CURRENT_TIMESTAMP',
			})
			.where('id = :postId', { postId })
			.execute();

		if ((updateResult.affected ?? 0) === 0) {
			return false;
		}

		await repo.getRepository(PostHashtag).delete({ post_id: postId });

		if (payload.tags.length === 0) {
			return true;
		}

		const hashtagRepo = repo.getRepository(Hashtag);
		await hashtagRepo
			.createQueryBuilder()
			.insert()
			.into(Hashtag)
			.values(payload.tags.map((name) => ({ name })))
			.orIgnore()
			.execute();

		const hashtagRows = await hashtagRepo
			.createQueryBuilder('hashtag')
			.select('hashtag.id', 'id')
			.addSelect('hashtag.name', 'name')
			.where('hashtag.name IN (:...names)', { names: payload.tags })
			.getRawMany<{ id: string; name: string }>();

		if (hashtagRows.length === 0) {
			return true;
		}

		const postHashtagRows = hashtagRows.map((row) => ({
			post_id: postId,
			hashtag_id: Number(row.id),
		}));

		await repo.getRepository(PostHashtag).insert(postHashtagRows);
		return true;
	}

	public async getRecentFeedCacheDataByAuthorId(
		authorUserId: number,
		limit: number,
	): Promise<FeedPostCacheDataDTO[]> {
		const safeLimit = Math.max(1, Math.min(limit, 10));

		const rows = await AppDataSource.getRepository(Post)
			.createQueryBuilder('post')
			.select('post.id', 'id')
			.where('post.user_id = :authorUserId', { authorUserId })
			.orderBy('post.created_at', 'DESC')
			.limit(safeLimit)
			.getRawMany<{ id: string }>();

		const orderedPostIds = rows
			.map((row) => Number(row.id))
			.filter((id) => Number.isFinite(id));

		if (orderedPostIds.length === 0) {
			return [];
		}

		const posts = await this.getFeedCacheDataByPostIds(orderedPostIds);
		const postsById = new Map(posts.map((post) => [post.postId, post]));

		return orderedPostIds
			.map((postId) => postsById.get(postId))
			.filter((post): post is FeedPostCacheDataDTO => Boolean(post));
	}

	public async getPostDeleteCandidate(postId: number): Promise<PostDeleteCandidateDTO | null> {
		const postRow = await AppDataSource.getRepository(Post)
			.createQueryBuilder('post')
			.select('post.id', 'post_id')
			.addSelect('post.user_id', 'author_id')
			.where('post.id = :postId', { postId })
			.getRawOne<{
				post_id: string;
				author_id: string;
			}>();

		if (!postRow) {
			return null;
		}

		const mediaRows = await AppDataSource.getRepository(PostMedia)
			.createQueryBuilder('media')
			.select('media.media_url', 'media_url')
			.addSelect('media.media_type', 'media_type')
			.where('media.post_id = :postId', { postId })
			.orderBy('media.position', 'ASC')
			.getRawMany<{
				media_url: string;
				media_type: 'image' | 'video';
			}>();

		return {
			postId: Number(postRow.post_id),
			authorId: Number(postRow.author_id),
			media: mediaRows.map((row) => ({
				mediaUrl: row.media_url,
				mediaType: row.media_type,
			})),
		};
	}

	public async deletePostGraphById(postId: number, manager?: EntityManager): Promise<boolean> {
		const repo = manager ?? AppDataSource.manager;

		await repo.getRepository(PostLike).delete({ post_id: postId });
		await repo
			.getRepository(Comment)
			.createQueryBuilder()
			.delete()
			.where('post_id = :postId', { postId })
			.execute();
		await repo.getRepository(PostHashtag).delete({ post_id: postId });
		await repo
			.getRepository(PostMedia)
			.createQueryBuilder()
			.delete()
			.where('post_id = :postId', { postId })
			.execute();

		const postDeleteResult = await repo
			.getRepository(Post)
			.createQueryBuilder()
			.delete()
			.where('id = :postId', { postId })
			.execute();

		return (postDeleteResult.affected ?? 0) > 0;
	}
}

export default new PostRepository();

