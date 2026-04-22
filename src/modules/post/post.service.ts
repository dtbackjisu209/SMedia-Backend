import { cloudinary } from '../../core/config/cloudinary.js';
import { env } from '../../core/config/env.js';
import type {
	CloudinaryUploadSignatureDTO,
	CreatePostPayloadDTO,
	CreatePostResultDTO,
	FeedPostCacheDataDTO,
	GetFeedResultDTO,
	PostDetailDTO,
	UserInterestDTO,
} from './post.dto.js';
import { enqueuePostFeedFanout } from './queues/post-fanout/post-fanout.producer.js';
import postRepository from './post.repository.js';
import postRedisService from './redis/post.redis.service.js';

class PostService {
	private static readonly FEED_LIMIT_DEFAULT = 100;
	private static readonly FEED_HALF_LIFE_HOURS = 18;
	private static readonly FEED_ENGAGEMENT_CAP = 500;

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

		const sortedMedia = [...media].sort((a, b) => a.position - b.position);
		const firstMedia = sortedMedia[0];

		const savedPost = await postRepository.createPostWithMedia({
			userId,
			caption: payload.caption,
			location: payload.location,
			media,
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

		const result: CreatePostResultDTO = {
			id: savedPost.id,
			caption: savedPost.caption,
			location: savedPost.location,
			created_at: savedPost.created_at,
		};
		return result;
	}

	public async getFeed(userId: number): Promise<GetFeedResultDTO> {
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

		const rankedItems = postIds
			.map((postId) => {
				const cached = cachedById.get(postId);

				if (!cached) {
					return null;
				}

				const rankingScore = this.calculateRankingScore(cached, userInterest);

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
				};
			})
			.filter((item): item is NonNullable<typeof item> => item !== null)
			.sort((a, b) => b.ranking_score - a.ranking_score);

		return {
			items: rankedItems,
		};
	}

	public async getPostDetail(postId: number): Promise<PostDetailDTO> {
		return postRepository.getPostDetailById(postId);
	}

	private calculateRankingScore(post: FeedPostCacheDataDTO, userInterest: UserInterestDTO): number {
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

		return Number(totalScore.toFixed(6));
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
}

export default new PostService();

