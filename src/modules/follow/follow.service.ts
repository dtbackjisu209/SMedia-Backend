import { AppDataSource } from '../../data-source.js';
import { BadRequestError, ConflictRequestError, NotFoundError } from '../../core/handler/error.response.js';
import { ensureRedisConnected, redisClient } from '../../core/config/redis.js';
import { Follow } from '../../database/entity/follow.entity.js';
import { FollowRequest } from '../../database/entity/followRequest.entity.js';
import { Notification } from '../../database/entity/notification.entity.js';
import { User } from '../../database/entity/user.entity.js';
import followRepository from './follow.repository.js';
import type {
  FollowActionResult,
  FollowUserSummary,
  PaginatedFollowResult,
  FollowListQuery,
} from './follow.dto.js';
import { normalizePagination } from './follow.dto.js';

const CACHE_TTL_SECONDS = 120;

const followerCountKey = (userId: number) => `follow:count:followers:${userId}`;
const followingCountKey = (userId: number) => `follow:count:following:${userId}`;

const toUserSummary = (user: User): FollowUserSummary => ({
  id: user.id,
  username: user.username,
  full_name: user.full_name,
  avatar_url: user.avatar_url,
  is_private: user.is_private,
});

const maybeParseCount = (value: string | null): number | null => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

class FollowService {
  private async safeEnsureRedisConnected(): Promise<boolean> {
    try {
      await ensureRedisConnected();
      return redisClient.isOpen;
    } catch {
      return false;
    }
  }

  private async invalidateCountCache(userIds: number[]): Promise<void> {
    const uniqueIds = Array.from(new Set(userIds));
    if (uniqueIds.length === 0) return;

    const ready = await this.safeEnsureRedisConnected();
    if (!ready) return;

    const keys = uniqueIds.flatMap((id) => [followerCountKey(id), followingCountKey(id)]);

    if (keys.length > 0) {
      await redisClient.del(keys).catch(() => undefined);
    }
  }

  private async getCachedCount(key: string): Promise<number | null> {
    const ready = await this.safeEnsureRedisConnected();
    if (!ready) return null;

    const raw = await redisClient.get(key).catch(() => null);
    return maybeParseCount(raw);
  }

  private async cacheCount(key: string, count: number): Promise<void> {
    const ready = await this.safeEnsureRedisConnected();
    if (!ready) return;

    await redisClient
      .set(key, String(count), {
        EX: CACHE_TTL_SECONDS,
      })
      .catch(() => undefined);
  }

  private async ensureUserExists(userId: number): Promise<User> {
    const user = await followRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }

  async follow(currentUserId: number, targetUserId: number): Promise<FollowActionResult> {
    if (!Number.isFinite(currentUserId) || !Number.isFinite(targetUserId)) {
      throw new BadRequestError('Invalid user id');
    }

    if (currentUserId === targetUserId) {
      throw new BadRequestError('Cannot follow yourself');
    }

    const [currentUser, targetUser] = await Promise.all([
      this.ensureUserExists(currentUserId),
      this.ensureUserExists(targetUserId),
    ]);

    const existingFollow = await followRepository.findFollow(currentUser.id, targetUser.id);
    if (existingFollow) {
      throw new ConflictRequestError('Already following this user');
    }

    const pendingRequest = await followRepository.findPendingFollowRequest(currentUser.id, targetUser.id);
    if (pendingRequest) {
      throw new ConflictRequestError('Follow request is already pending');
    }

    if (!targetUser.is_private) {
      await AppDataSource.transaction(async (manager) => {
        const followRepo = manager.getRepository(Follow);
        const requestRepo = manager.getRepository(FollowRequest);
        const notificationRepo = manager.getRepository(Notification);

        await followRepo.save(
          followRepo.create({
            follower_id: currentUser.id,
            following_id: targetUser.id,
          }),
        );

        await requestRepo.delete({ requester_id: currentUser.id, target_user_id: targetUser.id });

        await notificationRepo.save(
          notificationRepo.create({
            user: { id: targetUser.id } as User,
            type: 'follow',
            reference_id: currentUser.id,
            is_read: false,
          }),
        );
      });

      await this.invalidateCountCache([currentUser.id, targetUser.id]);

      return {
        mode: 'followed',
        followStatus: 'following',
      };
    }

    await AppDataSource.transaction(async (manager) => {
      const requestRepo = manager.getRepository(FollowRequest);
      const notificationRepo = manager.getRepository(Notification);

      const existingRequest = await requestRepo.findOne({
        where: {
          requester_id: currentUser.id,
          target_user_id: targetUser.id,
        },
      });

      if (existingRequest) {
        existingRequest.status = 'pending';
        await requestRepo.save(existingRequest);
      } else {
        await requestRepo.save(
          requestRepo.create({
            requester_id: currentUser.id,
            target_user_id: targetUser.id,
            status: 'pending',
          }),
        );
      }

      await notificationRepo.save(
        notificationRepo.create({
          user: { id: targetUser.id } as User,
          type: 'follow',
          reference_id: currentUser.id,
          is_read: false,
        }),
      );
    });

    return {
      mode: 'requested',
      followStatus: 'pending',
      requestStatus: 'pending',
    };
  }

  async unfollow(currentUserId: number, targetUserId: number): Promise<FollowActionResult> {
    if (!Number.isFinite(currentUserId) || !Number.isFinite(targetUserId)) {
      throw new BadRequestError('Invalid user id');
    }

    if (currentUserId === targetUserId) {
      throw new BadRequestError('Cannot unfollow yourself');
    }

    await Promise.all([this.ensureUserExists(currentUserId), this.ensureUserExists(targetUserId)]);

    const result = await AppDataSource.transaction(async (manager) => {
      const followRepo = manager.getRepository(Follow);
      const requestRepo = manager.getRepository(FollowRequest);

      const [followDeleteResult, requestDeleteResult] = await Promise.all([
        followRepo.delete({ follower_id: currentUserId, following_id: targetUserId }),
        requestRepo.delete({ requester_id: currentUserId, target_user_id: targetUserId, status: 'pending' }),
      ]);

      if ((followDeleteResult.affected ?? 0) > 0) {
        return {
          mode: 'unfollowed' as const,
          followStatus: 'none' as const,
        };
      }

      if ((requestDeleteResult.affected ?? 0) > 0) {
        return {
          mode: 'cancelled_request' as const,
          followStatus: 'none' as const,
        };
      }

      throw new NotFoundError('Follow relationship not found');
    });

    await this.invalidateCountCache([currentUserId, targetUserId]);

    return result;
  }

  async acceptRequest(currentUserId: number, requesterId: number): Promise<FollowActionResult> {
    if (!Number.isFinite(currentUserId) || !Number.isFinite(requesterId)) {
      throw new BadRequestError('Invalid user id');
    }

    if (currentUserId === requesterId) {
      throw new BadRequestError('Invalid follow request');
    }

    await Promise.all([this.ensureUserExists(currentUserId), this.ensureUserExists(requesterId)]);

    await AppDataSource.transaction(async (manager) => {
      const followRepo = manager.getRepository(Follow);
      const requestRepo = manager.getRepository(FollowRequest);
      const notificationRepo = manager.getRepository(Notification);

      const request = await requestRepo.findOne({
        where: {
          requester_id: requesterId,
          target_user_id: currentUserId,
          status: 'pending',
        },
      });

      if (!request) {
        throw new NotFoundError('Pending follow request not found');
      }

      const existingFollow = await followRepo.findOne({
        where: {
          follower_id: requesterId,
          following_id: currentUserId,
        },
      });

      if (!existingFollow) {
        await followRepo.save(
          followRepo.create({
            follower_id: requesterId,
            following_id: currentUserId,
          }),
        );
      }

      request.status = 'accepted';
      await requestRepo.save(request);

      await notificationRepo.save(
        notificationRepo.create({
          user: { id: requesterId } as User,
          type: 'follow',
          reference_id: currentUserId,
          is_read: false,
        }),
      );
    });

    await this.invalidateCountCache([currentUserId, requesterId]);

    return {
      mode: 'accepted',
      followStatus: 'following',
      requestStatus: 'accepted',
    };
  }

  async rejectRequest(currentUserId: number, requesterId: number): Promise<FollowActionResult> {
    if (!Number.isFinite(currentUserId) || !Number.isFinite(requesterId)) {
      throw new BadRequestError('Invalid user id');
    }

    if (currentUserId === requesterId) {
      throw new BadRequestError('Invalid follow request');
    }

    await Promise.all([this.ensureUserExists(currentUserId), this.ensureUserExists(requesterId)]);

    const pendingRequest = await followRepository.findPendingFollowRequest(requesterId, currentUserId);
    if (!pendingRequest) {
      throw new NotFoundError('Follow request not found');
    }

    const deleteResult = await AppDataSource.getRepository(FollowRequest).delete({ id: pendingRequest.id });
    if ((deleteResult.affected ?? 0) === 0) {
      throw new NotFoundError('Follow request not found');
    }

    return {
      mode: 'rejected',
      followStatus: 'none',
      requestStatus: 'rejected',
    };
  }

  async getFollowers(userId: number, query: FollowListQuery): Promise<PaginatedFollowResult> {
    await this.ensureUserExists(userId);

    const { page, limit } = normalizePagination(query);
    const skip = (page - 1) * limit;

    const [listResult, cachedCount] = await Promise.all([
      followRepository.listFollowers(userId, { skip, take: limit }),
      this.getCachedCount(followerCountKey(userId)),
    ]);

    const total = cachedCount ?? listResult.total;
    if (cachedCount === null) {
      await this.cacheCount(followerCountKey(userId), listResult.total);
    }

    return {
      items: listResult.users.map(toUserSummary),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getFollowing(userId: number, query: FollowListQuery): Promise<PaginatedFollowResult> {
    await this.ensureUserExists(userId);

    const { page, limit } = normalizePagination(query);
    const skip = (page - 1) * limit;

    const [listResult, cachedCount] = await Promise.all([
      followRepository.listFollowing(userId, { skip, take: limit }),
      this.getCachedCount(followingCountKey(userId)),
    ]);

    const total = cachedCount ?? listResult.total;
    if (cachedCount === null) {
      await this.cacheCount(followingCountKey(userId), listResult.total);
    }

    return {
      items: listResult.users.map(toUserSummary),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }
}

export default new FollowService();
