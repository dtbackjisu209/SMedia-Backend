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

export type DeleteCommentServiceInputDTO = {
	userId: number;
	commentId: number;
};

export type DeleteCommentResultDTO = {
	deleted: boolean;
};

export type GetCommentsByPostServiceInputDTO = {
	postId: number;
	limit: number;
	cursor?: number;
};

export type CommentItemDTO = {
	id: number;
	post_id: number;
	user_id: number;
	username: string;
	full_name: string;
	avatar_url: string | null;
	content: string;
	parent_id: number | null;
	created_at: Date;
};

export type GetCommentsByPostResultDTO = {
	comments: CommentItemDTO[];
	nextCursor: number | null;
};
