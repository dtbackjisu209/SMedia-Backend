export type UnfollowFeedCleanupJobData = {
	viewerUserId: number;
	targetAuthorId: number;
	unfollowedAtIso: string;
};

export type UnfollowFeedCleanupDlqData = {
	originalJobId: string;
	failedAtIso: string;
	failedReason: string;
	data: UnfollowFeedCleanupJobData;
};
