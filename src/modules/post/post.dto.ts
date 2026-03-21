export type PostMediaInputDTO = {
	media_url: string;
	media_type: 'image' | 'video';
	position: number;
};

export type CreatePostMediaDTO = {
	media_url: string;
	media_type: 'image' | 'video';
	position?: number;
};

export type CreatePostPayloadDTO = {
	caption?: string;
	location?: string;
	media: CreatePostMediaDTO[];
};

export type CreatePostWithMediaInputDTO = {
	userId: number;
	caption?: string;
	location?: string;
	media: PostMediaInputDTO[];
};

export type CreatePostResultDTO = {
	id: number;
	caption: string | null;
	location: string | null;
	created_at: Date;
};

export type CloudinaryUploadSignatureDTO = {
	cloudName: string;
	apiKey: string;
	folder: string;
	timestamp: number;
	signature: string;
};

