export type PostCacheRefreshTrigger = 'like' | 'unlike' | 'comment' | 'update';

export type PostCacheRefreshJobData = {
	postId: number;
	trigger: PostCacheRefreshTrigger;
	triggeredAtIso: string;
};

export type PostCacheRefreshDlqData = {
	originalJobId: string;
	failedAtIso: string;
	failedReason: string;
	data: PostCacheRefreshJobData;
};
