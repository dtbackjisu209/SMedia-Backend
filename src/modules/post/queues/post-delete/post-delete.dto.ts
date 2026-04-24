import type { PostDeleteMediaDTO } from '../../post.dto.js';

export type PostDeleteCleanupJobData = {
	postId: number;
	authorId: number;
	media: PostDeleteMediaDTO[];
	deletedAtIso: string;
};

export type PostDeleteCleanupDlqData = {
	originalJobId: string;
	failedAtIso: string;
	failedReason: string;
	data: PostDeleteCleanupJobData;
};
