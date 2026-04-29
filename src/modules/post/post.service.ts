import { cloudinary } from '../../core/config/cloudinary.js';
import { env } from '../../core/config/env.js';
import { AppDataSource } from '../../data-source.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../core/handler/error.response.js';
import type {
	CloudinaryUploadSignatureDTO,
	CreatePostPayloadDTO,
	CreatePostResultDTO,
	DeletePostResultDTO,
	FeedPostCacheDataDTO,
	FeedRankingDebugDTO,
	GetFeedResultDTO,
	PostDetailDTO,
	UpdatePostPayloadDTO,
	UpdatePostResultDTO,
	UserInterestDTO,
} from './post.dto.js';
import { enqueuePostDeleteCleanup } from './queues/post-delete/post-delete.producer.js';
import { enqueuePostFeedFanout } from './queues/post-fanout/post-fanout.producer.js';
import { enqueuePostCacheRefresh } from './queues/post-cache-refresh/post-cache-refresh.producer.js';
import notificationService from '../notification/notification.service.js';
import postRepository from './post.repository.js';
import postRedisService from './redis/post.redis.service.js';

class PostService {
	private static readonly FEED_LIMIT_DEFAULT = 100;
	private static readonly FEED_HALF_LIFE_HOURS = 18;
	private static readonly FEED_ENGAGEMENT_CAP = 500;
	private static readonly CAPTION_MAX_LENGTH = 2200;
	private static readonly LOCATION_MAX_LENGTH = 255;
	private static readonly TAG_MAX_LENGTH = 50;
	private static readonly TAG_MAX_COUNT = 20;

	public getUploadSignature(): CloudinaryUploadSignatureDTO {
		const timestamp = Math.floor(Date.now() / 1000);
		const signature = cloudinary.utils.api_sign_request(
			{
				folder: env.cloudinary.folder,
				timestamp,
			},
			env.cloudinary.apiSecret,
		);

		return {
			cloudName: env.cloudinary.cloudName,
			apiKey: env.cloudinary.apiKey,
			folder: env.cloudinary.folder,
			timestamp,
			signature,
		};
	}

	public async createPost(userId: number, payload: CreatePostPayloadDTO): Promise<CreatePostResultDTO> {
		const media = payload.media.map((item, index) => ({
			media_url: item.media_url,
			media_type: item.media_type,
			position: item.position ?? index,
		}));

		const normalizedTags = this.normalizeTags(payload.tags);

		const sortedMedia = [...media].sort((a, b) => a.position - b.position);
		const firstMedia = sortedMedia[0];

		const savedPost = await postRepository.createPostWithMedia({
			userId,
			caption: payload.caption,
			location: payload.location,
			media,
			tags: normalizedTags,
		});

		await enqueuePostFeedFanout({
			postId: savedPost.id,
			userId,
			caption: savedPost.caption,
			location: savedPost.location,
			createdAtIso: new Date(savedPost.created_at).toISOString(),
			likeCount: savedPost.like_count ?? 0,
			commentCount: savedPost.comment_count ?? 0,
			thumbnail: firstMedia?.media_url ?? '',
			mediaCount: media.length,
		});

		await notificationService.notifyFollowersAboutNewPost(userId, savedPost.id);

		const result: CreatePostResultDTO = {
			id: savedPost.id,
			caption: savedPost.caption,
			location: savedPost.location,
			created_at: savedPost.created_at,
		};
		return result;
	}

	public async getFeed(
		userId: number,
		options?: { debugRanking?: boolean },
	): Promise<GetFeedResultDTO> {
		const debugRanking = options?.debugRanking ?? false;
		const shouldLogRanking = debugRanking || process.env.NODE_ENV !== 'production';
		const postIds = await postRedisService.getFeedPostIds(userId, PostService.FEED_LIMIT_DEFAULT);
		if (postIds.length === 0) {
			return { items: [] };
		}

		const [cachedPostData, userInterest] = await Promise.all([
			postRedisService.getPostCacheDataBatch(postIds),
			postRedisService.getUserInterest(userId),
		]);

		const cachedById = new Map(cachedPostData.map((item) => [item.postId, item]));
		const missingPostIds = postIds.filter((postId) => !cachedById.has(postId));

		if (missingPostIds.length > 0) {
			const fallbackPostData = await postRepository.getFeedCacheDataByPostIds(missingPostIds);

			if (fallbackPostData.length > 0) {
				await postRedisService.cachePostCacheDataBatch(fallbackPostData);
				for (const item of fallbackPostData) {
					cachedById.set(item.postId, item);
				}
			}

			const recoveredPostIds = new Set(fallbackPostData.map((item) => item.postId));
			const orphanPostIds = missingPostIds.filter((postId) => !recoveredPostIds.has(postId));

			if (orphanPostIds.length > 0) {
				await postRedisService.removePostIdsFromFeed(userId, orphanPostIds);
			}
		}

		const rankedItemsWithDebug = postIds
			.map((postId) => {
				const cached = cachedById.get(postId);

				if (!cached) {
					return null;
				}

				const rankingBreakdown = this.calculateRankingBreakdown(cached, userInterest);
				const rankingScore = rankingBreakdown.total_score;

				return {
					id: cached.postId,
					caption: cached.caption,
					location: cached.location,
					created_at: cached.createdAt,
					author: cached.author,
					like_count: cached.likeCount,
					comment_count: cached.commentCount,
					tags: cached.tags,
					thumbnail: cached.thumbnail,
					media_count: cached.mediaCount,
					ranking_score: rankingScore,
					ranking_debug: rankingBreakdown,
				};
			})
			.filter((item): item is NonNullable<typeof item> => item !== null)
			.sort((a, b) => b.ranking_score - a.ranking_score);

		if (shouldLogRanking) {
			console.log(
				'[feed-ranking-debug]',
				JSON.stringify({
					user_id: userId,
					user_interest: userInterest,
					items: rankedItemsWithDebug,
				}),
			);
		}

		const responseItems = debugRanking
			? rankedItemsWithDebug
			: rankedItemsWithDebug.map(({ ranking_debug: _ranking_debug, ...rest }) => rest);

		return {
			items: responseItems,
		};
	}

	public async getPostDetail(postId: number): Promise<PostDetailDTO> {
		return postRepository.getPostDetailById(postId);
	}

	public async updatePost(
		userId: number,
		postId: number,
		payload: UpdatePostPayloadDTO,
	): Promise<UpdatePostResultDTO> {
		const hasAtLeastOneField =
			payload.caption !== undefined || payload.location !== undefined || payload.tags !== undefined;
		if (!hasAtLeastOneField) {
			throw new BadRequestError('At least one field must be provided: caption, location, tags');
		}

		const ownerId = await postRepository.getPostOwnerId(postId);
		if (ownerId === null) {
			throw new NotFoundError(`Post not found with id ${postId}`);
		}

		if (Number(ownerId) !== Number(userId)) {
			throw new ForbiddenError('You can only update your own post');
		}

		const [currentPost, currentTags] = await Promise.all([
			postRepository.getPostDetailById(postId),
			postRepository.getTagsByPostId(postId),
		]);

		const normalizedCaption =
			payload.caption === undefined
				? currentPost.caption
				: this.normalizeOptionalText(payload.caption, PostService.CAPTION_MAX_LENGTH);
		const normalizedLocation =
			payload.location === undefined
				? currentPost.location
				: this.normalizeOptionalText(payload.location, PostService.LOCATION_MAX_LENGTH);
		const normalizedTags =
			payload.tags === undefined ? currentTags : this.normalizeTags(payload.tags);

		await AppDataSource.transaction(async (manager) => {
			const updated = await postRepository.updatePostMetadataAndTags(
				postId,
				{
					caption: normalizedCaption,
					location: normalizedLocation,
					tags: normalizedTags,
				},
				manager,
			);

			if (!updated) {
				throw new NotFoundError(`Post not found with id ${postId}`);
			}
		});

		try {
			await enqueuePostCacheRefresh({
				postId,
				trigger: 'update',
				triggeredAtIso: new Date().toISOString(),
			});
		} catch (error) {
			console.error('[post-update] enqueue cache refresh failed:', { postId, error });
		}

		const updatedPost = await postRepository.getPostDetailById(postId);
		const tags = await postRepository.getTagsByPostId(postId);

		return {
			id: updatedPost.id,
			caption: updatedPost.caption,
			location: updatedPost.location,
			tags,
			created_at: updatedPost.created_at,
		};
	}

	public async deletePost(userId: number, postId: number): Promise<DeletePostResultDTO> {
		const candidate = await postRepository.getPostDeleteCandidate(postId);
		if (!candidate) {
			throw new NotFoundError(`Post not found with id ${postId}`);
		}

		if (Number(candidate.authorId) !== Number(userId)) {
			throw new ForbiddenError('You can only delete your own post');
		}

		await AppDataSource.transaction(async (manager) => {
			const deleted = await postRepository.deletePostGraphById(postId, manager);
			if (!deleted) {
				throw new NotFoundError(`Post not found with id ${postId}`);
			}
		});

		let cleanupStatus: DeletePostResultDTO['cleanupStatus'] = 'queued';

		try {
			await enqueuePostDeleteCleanup({
				postId,
				authorId: candidate.authorId,
				media: candidate.media,
				deletedAtIso: new Date().toISOString(),
			});
		} catch (error) {
			console.error('[post-delete] enqueue failed (attempt 1):', error);
			try {
				await enqueuePostDeleteCleanup({
					postId,
					authorId: candidate.authorId,
					media: candidate.media,
					deletedAtIso: new Date().toISOString(),
				});
			} catch (retryError) {
				cleanupStatus = 'queue_failed';
				console.error('[post-delete] enqueue failed (attempt 2):', retryError);
			}
		}

		return {
			postId,
			cleanupStatus,
		};
	}

	private calculateRankingScore(post: FeedPostCacheDataDTO, userInterest: UserInterestDTO): number {
		return this.calculateRankingBreakdown(post, userInterest).total_score;
	}

	private calculateRankingBreakdown(
		post: FeedPostCacheDataDTO,
		userInterest: UserInterestDTO,
	): FeedRankingDebugDTO {
		const now = Date.now();
		const ageMs = Math.max(0, now - post.createdAt.getTime());
		const ageHours = ageMs / (1000 * 60 * 60);

		const engagementRaw = post.likeCount + post.commentCount * 2;
		const engagementScore =
			Math.log1p(Math.max(0, engagementRaw)) / Math.log1p(PostService.FEED_ENGAGEMENT_CAP);
		const boundedEngagement = Math.min(1, engagementScore);

		const recencyScore = Math.exp(
			(-Math.LN2 * ageHours) / PostService.FEED_HALF_LIFE_HOURS,
		);

		const interestScore = this.calculateInterestScore(post.tags, userInterest);

		const totalScore = boundedEngagement * 0.5 + recencyScore * 0.35 + interestScore * 0.15;

		return {
			age_hours: Number(ageHours.toFixed(6)),
			engagement_raw: engagementRaw,
			engagement_score: Number(engagementScore.toFixed(6)),
			bounded_engagement: Number(boundedEngagement.toFixed(6)),
			recency_score: Number(recencyScore.toFixed(6)),
			interest_score: Number(interestScore.toFixed(6)),
			total_score: Number(totalScore.toFixed(6)),
		};
	}

	private calculateInterestScore(tags: string[], userInterest: UserInterestDTO): number {
		if (tags.length === 0 || Object.keys(userInterest).length === 0) {
			return 0;
		}

		const normalizedTags = [...new Set(tags.map((tag) => tag.trim().toLowerCase()))].filter(
			(tag) => tag.length > 0,
		);

		if (normalizedTags.length === 0) {
			return 0;
		}

		const maxInterestWeight = Math.max(...Object.values(userInterest));
		if (!Number.isFinite(maxInterestWeight) || maxInterestWeight <= 0) {
			return 0;
		}

		const hitScores = normalizedTags.map((tag) => {
			const weight = userInterest[tag] ?? 0;
			return Math.min(1, weight / maxInterestWeight);
		});

		const sum = hitScores.reduce((acc, value) => acc + value, 0);
		return sum / hitScores.length;
	}

	private normalizeOptionalText(value: string, maxLength: number): string | null {
		const trimmed = value.trim();
		if (trimmed.length > maxLength) {
			throw new BadRequestError(`Text exceeds maximum length ${maxLength}`);
		}

		return trimmed.length === 0 ? null : trimmed;
	}

	private normalizeTags(tags: string[] | undefined): string[] {
		if (tags === undefined) {
			return [];
		}

		if (tags.length > PostService.TAG_MAX_COUNT) {
			throw new BadRequestError(`tags cannot exceed ${PostService.TAG_MAX_COUNT} items`);
		}

		const normalized = tags
			.map((tag) => tag.trim().toLowerCase())
			.filter((tag) => tag.length > 0)
			.map((tag) => (tag.startsWith('#') ? tag.slice(1) : tag))
			.filter((tag) => tag.length > 0);

		for (const tag of normalized) {
			if (tag.length > PostService.TAG_MAX_LENGTH) {
				throw new BadRequestError(`tag exceeds maximum length ${PostService.TAG_MAX_LENGTH}`);
			}
		}

		return Array.from(new Set(normalized));
	}
}

export default new PostService();

