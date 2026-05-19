export interface ProfileSearchQueryDto {
  q?: string;
  limit?: number;
}

export interface ProfileUserSummaryDto {
  id: number;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  is_private: boolean;
}

export interface ProfilePostMediaDto {
  media_url: string;
  media_type: 'image' | 'video';
  position: number;
}

export interface ProfilePostDto {
  id: number;
  caption: string | null;
  location: string | null;
  created_at: Date;
  like_count: number;
  comment_count: number;
  media_count: number;
  thumbnail: string | null;
  media: ProfilePostMediaDto[];
}

export interface ProfileHighlightStoryDto {
  id: number;
  media_url: string;
  media_type: 'image' | 'video';
  created_at: Date;
  expires_at: Date;
}

export interface ProfileHighlightDto {
  id: number;
  title: string;
  cover_media_url: string | null;
  created_at: Date;
  story_count: number;
  stories: ProfileHighlightStoryDto[];
}

export interface ProfileViewDto {
  id: number;
  username: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_private: boolean;
  created_at: Date;
  follower_count: number;
  following_count: number;
  post_count: number;
  is_following: boolean;
  has_pending_request: boolean;
  highlights: ProfileHighlightDto[];
  posts: ProfilePostDto[];
}

export interface ProfileUpdateDto {
  username?: string;
  full_name?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  is_private?: boolean;
}

export interface ProfilePasswordChangeDto {
  current_password?: string;
  new_password?: string;
}
