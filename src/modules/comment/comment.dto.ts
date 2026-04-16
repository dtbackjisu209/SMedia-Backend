export type CreateCommentRequestDTO = {
	postId: number;
	content: string;
	parentId?: number;
};

export type CreateCommentServiceInputDTO = {
	userId: number;
	postId: number;
	content: string;
	parentId?: number;
};

export type CreateCommentRepositoryInputDTO = CreateCommentServiceInputDTO;

export type CreateCommentResultDTO = {
	id: number;
	post_id: number;
	user_id: number;
	content: string;
	parent_id: number | null;
	created_at: Date;
};
