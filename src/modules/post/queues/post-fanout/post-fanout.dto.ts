export type PostFeedFanoutJobData = {
	postId: number;
	userId: number;
	caption: string | null;
	location: string | null;
	createdAtIso: string;
	likeCount: number;
	commentCount: number;
	thumbnail: string;
	mediaCount: number;
};

export type PostFeedFanoutDlqData = {
	originalJobId: string;
	failedAtIso: string;
	failedReason: string;
	data: PostFeedFanoutJobData;
};
