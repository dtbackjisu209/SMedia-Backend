export type StoryModerationJobData = {
	storyId: number;
	userId: number;
	authorId: number;
	caption: string | null;
	mediaUrl: string;
	mediaType: 'image' | 'video';
	enqueuedAtIso: string;
};

export type StoryModerationDlqData = {
	originalJobId: string;
	failedAtIso: string;
	failedReason: string;
	data: StoryModerationJobData;
};
