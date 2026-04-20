export type LikePostRequestDTO = {
	postId: number;
};

export type LikePostServiceInputDTO = {
	userId: number;
	postId: number;
};

export type UnlikePostServiceInputDTO = {
	userId: number;
	postId: number;
};

export type LikePostResultDTO = {
	liked: boolean;
};

export type UnlikePostResultDTO = {
	unliked: boolean;
};
