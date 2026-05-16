import { ensureRedisConnected, redisClient } from '../../../core/config/redis.js';
import type {
	CacheNewPostFeedInputDTO,
	FeedPostCacheDataDTO,
	UserInterestDTO,
} from '../post.dto.js';
import { postRedisKeys } from './post.redis.keys.js';

class PostRedisService {
	private static readonly FEED_READ_LIMIT_MAX = 100;

	public async cacheNewPostToFeeds(input: CacheNewPostFeedInputDTO): Promise<void> {
		const {
			postId,
			caption,
			location,
			tags,
			createdAt,
			likeCount,
			commentCount,
			thumbnail,
			mediaCount,
			author,
			feedUserIds,
		} = input;

		await ensureRedisConnected();

		const score = createdAt.getTime();
		const postIdValue = String(postId);

		const pipeline = redisClient.multi();
		pipeline.hSet(postRedisKeys.postData(postId), {
			caption: caption ?? '',
			location: location ?? '',
			like_count: String(likeCount),
			comment_count: String(commentCount),
			created_at: createdAt.toISOString(),
			tags: JSON.stringify(tags ?? []),
			thumbnail,
			media_count: String(mediaCount),
			author_id: String(author.id),
			author_username: author.username,
			author_full_name: author.fullName ?? '',
			author_avatar_url: author.avatarUrl ?? '',
		});

		for (const feedUserId of feedUserIds) {
			pipeline.zAdd(postRedisKeys.feed(feedUserId), {
				score,
				value: postIdValue,
			});
			pipeline.zRemRangeByRank(postRedisKeys.feed(feedUserId), 0, -101);
		}

		await pipeline.exec();
	}

	public async getFeedPostIds(userId: number, limit: number): Promise<number[]> {
		await ensureRedisConnected();
		const safeLimit = Math.max(1, Math.min(limit, PostRedisService.FEED_READ_LIMIT_MAX));

		const rawPostIds = await redisClient.zRange(postRedisKeys.feed(userId), 0, safeLimit - 1, {
			REV: true,
		});

		return rawPostIds.map((id) => Number(id)).filter((id) => Number.isFinite(id));
	}

	public async getAllFeedPostIds(userId: number): Promise<number[]> {
		await ensureRedisConnected();

		const rawPostIds = await redisClient.zRange(postRedisKeys.feed(userId), 0, -1, {
			REV: true,
		});

		return rawPostIds.map((id) => Number(id)).filter((id) => Number.isFinite(id));
	}

	public async getPostCacheDataBatch(postIds: number[]): Promise<FeedPostCacheDataDTO[]> {
		if (postIds.length === 0) {
			return [];
		}

		await ensureRedisConnected();

		const pipeline = redisClient.multi();
		for (const postId of postIds) {
			pipeline.hGetAll(postRedisKeys.postData(postId));
		}

		const rows = await pipeline.exec();
		if (!rows) {
			return [];
		}

		const results: FeedPostCacheDataDTO[] = [];
		for (let index = 0; index < rows.length; index += 1) {
			const postId = postIds[index];
			const row = rows[index] as unknown as Record<string, string>;

			if (!row || Object.keys(row).length === 0) {
				continue;
			}

			const createdAt = new Date(row.created_at);
			if (Number.isNaN(createdAt.getTime())) {
				continue;
			}

			results.push({
				postId,
				caption: row.caption || null,
				location: row.location || null,
				likeCount: this.toNumber(row.like_count),
				commentCount: this.toNumber(row.comment_count),
				createdAt,
				tags: this.parseTags(row.tags),
				thumbnail: row.thumbnail ?? '',
				mediaCount: this.toNumber(row.media_count),
				author: {
					id: this.toNumber(row.author_id),
					username: row.author_username ?? '',
					fullName: row.author_full_name || null,
					avatarUrl: row.author_avatar_url || null,
				},
			});
		}

		return results;
	}

	public async cachePostCacheDataBatch(posts: FeedPostCacheDataDTO[]): Promise<void> {
		if (posts.length === 0) {
			return;
		}

		await ensureRedisConnected();

		const pipeline = redisClient.multi();
		for (const post of posts) {
			pipeline.hSet(postRedisKeys.postData(post.postId), {
				caption: post.caption ?? '',
				location: post.location ?? '',
				like_count: String(post.likeCount),
				comment_count: String(post.commentCount),
				created_at: post.createdAt.toISOString(),
				tags: JSON.stringify(post.tags),
				thumbnail: post.thumbnail,
				media_count: String(post.mediaCount),
				author_id: String(post.author.id),
				author_username: post.author.username,
				author_full_name: post.author.fullName ?? '',
				author_avatar_url: post.author.avatarUrl ?? '',
			});
		}

		await pipeline.exec();
	}

	public async removePostIdsFromFeed(userId: number, postIds: number[]): Promise<void> {
		if (postIds.length === 0) {
			return;
		}

		await ensureRedisConnected();
		await redisClient.zRem(
			postRedisKeys.feed(userId),
			postIds.map((postId) => String(postId)),
		);
	}

	public async removePostIdFromFeeds(userIds: number[], postId: number): Promise<void> {
		if (userIds.length === 0) {
			return;
		}

		await ensureRedisConnected();

		const pipeline = redisClient.multi();
		for (const userId of userIds) {
			pipeline.zRem(postRedisKeys.feed(userId), String(postId));
		}

		await pipeline.exec();
	}

	public async deletePostCache(postId: number): Promise<void> {
		await ensureRedisConnected();
		await redisClient.del(postRedisKeys.postData(postId));
	}

	public async warmFeedWithRecentPosts(userId: number, posts: FeedPostCacheDataDTO[]): Promise<void> {
		if (posts.length === 0) {
			return;
		}

		await ensureRedisConnected();

		const pipeline = redisClient.multi();
		for (const post of posts) {
			pipeline.hSet(postRedisKeys.postData(post.postId), {
				caption: post.caption ?? '',
				location: post.location ?? '',
				like_count: String(post.likeCount),
				comment_count: String(post.commentCount),
				created_at: post.createdAt.toISOString(),
				tags: JSON.stringify(post.tags),
				thumbnail: post.thumbnail,
				media_count: String(post.mediaCount),
				author_id: String(post.author.id),
				author_username: post.author.username,
				author_full_name: post.author.fullName ?? '',
				author_avatar_url: post.author.avatarUrl ?? '',
			});

			pipeline.zAdd(postRedisKeys.feed(userId), {
				score: post.createdAt.getTime(),
				value: String(post.postId),
			});
		}

		// Keep newest 100 posts after merge, preserving old feed entries.
		pipeline.zRemRangeByRank(postRedisKeys.feed(userId), 0, -101);

		await pipeline.exec();
	}

	public async getUserInterest(userId: number): Promise<UserInterestDTO> {
		await ensureRedisConnected();

		const rawMap = await redisClient.hGetAll(postRedisKeys.userInterest(userId));
		if (!rawMap || Object.keys(rawMap).length === 0) {
			return {};
		}

		const normalized: UserInterestDTO = {};
		for (const [key, value] of Object.entries(rawMap)) {
			const normalizedKey = key.trim().toLowerCase();
			if (normalizedKey.length === 0) {
				continue;
			}

			const parsedValue = Number(value);
			if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
				continue;
			}

			normalized[normalizedKey] = parsedValue;
		}

		return normalized;
	}

	public async incrementUserInterest(
		userId: number,
		tags: string[],
		delta: number,
	): Promise<void> {
		if (delta <= 0 || tags.length === 0) {
			return;
		}

		const normalizedTags = [...new Set(
			tags.map((tag) => tag.trim().toLowerCase()).filter((tag) => tag.length > 0),
		)];
		if (normalizedTags.length === 0) {
			return;
		}

		await ensureRedisConnected();

		const pipeline = redisClient.multi();
		for (const tag of normalizedTags) {
			pipeline.hIncrByFloat(postRedisKeys.userInterest(userId), tag, delta);
		}

		await pipeline.exec();
	}

	public async rebuildFromDB(userId: number, interests: UserInterestDTO): Promise<void> {
		await ensureRedisConnected();

		const entries = Object.entries(interests)
			.map(([tag, score]) => [tag.trim().toLowerCase(), score] as const)
			.filter(([tag, score]) => tag.length > 0 && Number.isFinite(score) && score > 0);

		const key = postRedisKeys.userInterest(userId);
		const pipeline = redisClient.multi();
		pipeline.del(key);

		for (const [tag, score] of entries) {
			pipeline.hSet(key, tag, String(score));
		}

		await pipeline.exec();
	}

	private toNumber(value: string | undefined): number {
		if (!value) {
			return 0;
		}

		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : 0;
	}

	private parseTags(raw: string | undefined): string[] {
		if (!raw) {
			return [];
		}

		try {
			const parsed = JSON.parse(raw) as unknown;
			if (!Array.isArray(parsed)) {
				return [];
			}

			return parsed
				.filter((item): item is string => typeof item === 'string')
				.map((tag) => tag.trim().toLowerCase())
				.filter((tag) => tag.length > 0);
		} catch {
			return [];
		}
	}

}

export default new PostRedisService();
