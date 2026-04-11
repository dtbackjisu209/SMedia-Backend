export interface SearchUsersQueryDto {
  username?: string;
  limit?: number;
}

export interface UserSearchResultDto {
  id: number;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  is_private: boolean;
}

export interface UserProfileDto {
  id: number;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  is_private: boolean;
  created_at: Date;
  follower_count: number;
  following_count: number;
  is_following: boolean;
  has_pending_request: boolean;
}
