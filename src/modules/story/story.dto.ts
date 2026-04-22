export type StoryMediaType = 'image' | 'video';

export interface PersistStoryInputDTO {
	userId: number;
	media_url: string;
	media_type: StoryMediaType;
	expires_at: Date;
}

export interface CreateStoryResultDTO {
	id: number;
	media_url: string;
	media_type: StoryMediaType;
	expires_at: Date;
	created_at: Date;
}
