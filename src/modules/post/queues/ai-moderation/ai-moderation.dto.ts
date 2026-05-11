export type AiModerationJobData = {
	postId: number;
	userId: number;
	authorId: number;
	caption: string | null;
	mediaItems: Array<{
		mediaUrl: string;
		mediaType: 'image' | 'video';
	}>;
	enqueuedAtIso: string;
};

export type AiModerationDlqData = {
	originalJobId: string;
	failedAtIso: string;
	failedReason: string;
	data: AiModerationJobData;
};
