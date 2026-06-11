import type { FollowRequestStatus } from '../../database/entity/followRequest.entity.js';

export interface FollowActionPayload {
  targetUserId: number;
}

export interface FollowRequestDecisionPayload {
  requesterId: number;
}

export interface FollowListQuery {
  page?: number;
  limit?: number;
}

export interface FollowSuggestionQuery {
  limit?: number;
}

export interface FollowUserSummary {
  id: number;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  is_private: boolean;
}

export interface PaginatedFollowResult {
  items: FollowUserSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface FollowSuggestionItem {
  id: number;
  username: string;
  avatar_url: string | null;
  score: number;
  mutual_follow_count?: number;
  search_view_count?: number;
  recency_score?: number;
}

export interface FollowSuggestionsResult {
  items: FollowSuggestionItem[];
}

export interface FollowActionResult {
  mode: 'followed' | 'requested' | 'unfollowed' | 'cancelled_request' | 'accepted' | 'rejected';
  followStatus: 'following' | 'pending' | 'none';
  requestStatus?: FollowRequestStatus;
}

export const normalizePagination = (query: FollowListQuery): Required<FollowListQuery> => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;

  return {
    page: page > 0 ? page : 1,
    limit: Math.min(Math.max(limit, 1), 100),
  };
};

export const normalizeSuggestionLimit = (query: FollowSuggestionQuery): number => {
  const limit = Number(query.limit) || 5;
  return Math.min(Math.max(limit, 1), 20);
};
