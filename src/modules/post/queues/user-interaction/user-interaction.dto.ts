export type UserInteractionType = 'like' | 'comment' | 'view';

export type UserInteractionJobData = {
	userId: number;
	postId: number;
	type: UserInteractionType;
	tags: string[];
};

export type UserInteractionDlqData = {
	originalJobId: string;
	failedAtIso: string;
	failedReason: string;
	data: UserInteractionJobData;
};
