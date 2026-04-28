export type PostMediaInputDTO = {
	media_url: string;
	media_type: 'image' | 'video';
	position: number;
};

export type CreatePostMediaDTO = {
	media_url: string;
	media_type: 'image' | 'video';
	position?: number;
};

export type CreatePostPayloadDTO = {
	caption?: string;
	location?: string;
	media: CreatePostMediaDTO[];
	tags?: string[];
};

export type UpdatePostPayloadDTO = {
	caption?: string;
	location?: string;
	tags?: string[];
};

export type CreatePostWithMediaInputDTO = {
	userId: number;
	caption?: string;
	location?: string;
	media: PostMediaInputDTO[];
	tags?: string[];
};

export type CreatePostResultDTO = {
	id: number;
	caption: string | null;
	location: string | null;
	created_at: Date;
};

export type UpdatePostResultDTO = {
	id: number;
	caption: string | null;
	location: string | null;
	tags: string[];
	created_at: Date;
};

export type CloudinaryUploadSignatureDTO = {
	cloudName: string;
	apiKey: string;
	folder: string;
	timestamp: number;
	signature: string;
};

export type CacheNewPostFeedInputDTO = {
	postId: number;
	caption: string | null;
	location: string | null;
	createdAt: Date;
	likeCount: number;
	commentCount: number;
	thumbnail: string;
	mediaCount: number;
	author: FeedAuthorDTO;
	feedUserIds: number[];
};

export type FeedPostCacheDataDTO = {
	postId: number;
	caption: string | null;
	location: string | null;
	likeCount: number;
	commentCount: number;
	createdAt: Date;
	tags: string[];
	thumbnail: string;
	mediaCount: number;
	author: FeedAuthorDTO;
};

export type UserInterestDTO = Record<string, number>;

export type FeedAuthorDTO = {
	id: number;
	username: string;
	fullName: string | null;
	avatarUrl: string | null;
};

export type FeedMediaDTO = {
	mediaUrl: string;
	mediaType: 'image' | 'video';
	position: number;
};

export type FeedRankingDebugDTO = {
	age_hours: number;
	engagement_raw: number;
	engagement_score: number;
	bounded_engagement: number;
	recency_score: number;
	interest_score: number;
	total_score: number;
};

export type FeedItemDTO = {
	id: number;
	caption: string | null;
	location: string | null;
	created_at: Date;
	author: FeedAuthorDTO;
	like_count: number;
	comment_count: number;
	tags: string[];
	thumbnail: string;
	media_count: number;
	ranking_score: number;
	ranking_debug?: FeedRankingDebugDTO;
};

export type GetFeedResultDTO = {
	items: FeedItemDTO[];
};

export type PostDetailDTO = {
	id: number;
	caption: string | null;
	location: string | null;
	created_at: Date;
	author: FeedAuthorDTO;
	media: FeedMediaDTO[];
	like_count: number;
	comment_count: number;
};

export type DeletePostCleanupStatusDTO = 'queued' | 'queue_failed';

export type DeletePostResultDTO = {
	postId: number;
	cleanupStatus: DeletePostCleanupStatusDTO;
};

export type PostDeleteMediaDTO = {
	mediaUrl: string;
	mediaType: 'image' | 'video';
};

export type PostDeleteCandidateDTO = {
	postId: number;
	authorId: number;
	media: PostDeleteMediaDTO[];
};

