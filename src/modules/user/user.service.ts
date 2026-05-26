import { BadRequestError, NotFoundError } from '../../core/handler/error.response.js';
import userRepository from './user.repository.js';
import type { SearchUsersQueryDto, UserProfileDto, UserSearchResultDto } from './user.dto.js';
import { AppDataSource } from '../../data-source.js';
import { Follow } from '../../database/entity/follow.entity.js';
import { FollowRequest } from '../../database/entity/followRequest.entity.js';
import { normalizePublicAssetUrl } from '../../utils/publicAssetUrl.js';

class UserService {
  private followRepo = AppDataSource.getRepository(Follow);
  private followRequestRepo = AppDataSource.getRepository(FollowRequest);

  async searchUsers(query: SearchUsersQueryDto): Promise<UserSearchResultDto[]> {
    const rawKeyword = (query.username ?? '').trim();
    if (rawKeyword.length === 0) {
      return [];
    }

    const limitValue = Number(query.limit ?? 10);
    if (!Number.isFinite(limitValue) || limitValue <= 0) {
      throw new BadRequestError('limit must be a positive number');
    }

    const limit = Math.min(limitValue, 30);
    const users = await userRepository.searchByUsername(rawKeyword, limit);

    return users.map((user) => ({
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      avatar_url: normalizePublicAssetUrl(user.avatar_url),
      is_private: user.is_private,
    }));
  }

  async getUserProfileById(targetUserId: number, viewerUserId?: number): Promise<UserProfileDto> {
    if (!Number.isFinite(targetUserId) || targetUserId <= 0) {
      throw new BadRequestError('Invalid user id');
    }

    const user = await userRepository.findById(targetUserId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const [followerCount, followingCount] = await Promise.all([
      this.followRepo.count({ where: { following_id: targetUserId } }),
      this.followRepo.count({ where: { follower_id: targetUserId } }),
    ]);

    let isFollowing = false;
    let hasPendingRequest = false;

    if (viewerUserId && viewerUserId !== targetUserId) {
      const [follow, pendingRequest] = await Promise.all([
        this.followRepo.findOne({
          where: {
            follower_id: viewerUserId,
            following_id: targetUserId,
          },
        }),
        this.followRequestRepo.findOne({
          where: {
            requester_id: viewerUserId,
            target_user_id: targetUserId,
            status: 'pending',
          },
        }),
      ]);

      isFollowing = Boolean(follow);
      hasPendingRequest = Boolean(pendingRequest);
    }

    return {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      avatar_url: normalizePublicAssetUrl(user.avatar_url),
      is_private: user.is_private,
      created_at: user.created_at,
      follower_count: followerCount,
      following_count: followingCount,
      is_following: isFollowing,
      has_pending_request: hasPendingRequest,
    };
  }
}

export default new UserService();
