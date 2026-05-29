import { AppDataSource } from '../../data-source.js';
import { BadRequestError, ConflictRequestError, NotFoundError } from '../../core/handler/error.response.js';
import { ensureRedisConnected, redisClient } from '../../core/config/redis.js';
import { Follow } from '../../database/entity/follow.entity.js';
import { FollowRequest } from '../../database/entity/followRequest.entity.js';
import { User } from '../../database/entity/user.entity.js';
import followRepository from './follow.repository.js';
import postRepository from '../post/post.repository.js';
import postRedisService from '../post/redis/post.redis.service.js';
import { enqueueUnfollowFeedCleanup } from './queues/unfollow-feed-cleanup/unfollow-feed-cleanup.producer.js';
import type {
  FollowActionResult,
  FollowUserSummary,
  PaginatedFollowResult,
  FollowListQuery,
} from './follow.dto.js';
import { normalizePagination } from './follow.dto.js';
import notificationService from '../notification/notification.service.js';
import { normalizePublicAssetUrl } from '../../utils/publicAssetUrl.js';

const CACHE_TTL_SECONDS = 120;
const FOLLOW_FEED_WARMUP_LIMIT = 10;

const followerCountKey = (userId: number) => `follow:count:followers:${userId}`;
const followingCountKey = (userId: number) => `follow:count:following:${userId}`;

const toUserSummary = (user: User): FollowUserSummary => ({
  id: user.id,
  username: user.username,
  full_name: user.full_name,
  avatar_url: normalizePublicAssetUrl(user.avatar_url),
  is_private: user.is_private,
});

const maybeParseCount = (value: string | null): number | null => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

class FollowService {
  private async cleanupUnfollowedAuthorFromViewerFeed(
    viewerUserId: number,
    targetAuthorId: number,
  ): Promise<void> {
    const feedPostIds = await postRedisService.getAllFeedPostIds(viewerUserId);
    if (feedPostIds.length === 0) {
      return;
    }

    const authorByPostId = await postRepository.getPostAuthorIdsByPostIds(feedPostIds);
    const postIdsToRemove = feedPostIds.filter(
      (postId) => authorByPostId.get(postId) === targetAuthorId,
    );

    if (postIdsToRemove.length === 0) {
      return;
    }

    await postRedisService.removePostIdsFromFeed(viewerUserId, postIdsToRemove);
  }

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

  private async warmFollowerFeedAfterFollow(followerUserId: number, followedUserId: number): Promise<void> {
    try {
      const recentPosts = await postRepository.getRecentFeedCacheDataByAuthorId(
        followedUserId,
        FOLLOW_FEED_WARMUP_LIMIT,
      );

      if (recentPosts.length === 0) {
        return;
      }

      await postRedisService.warmFeedWithRecentPosts(followerUserId, recentPosts);
    } catch (error) {
      console.error('[follow] feed warmup failed:', error);
    }
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
      let createdNotification: Awaited<ReturnType<typeof notificationService.createNotification>> | null = null;

      await AppDataSource.transaction(async (manager) => {
        const followRepo = manager.getRepository(Follow);
        const requestRepo = manager.getRepository(FollowRequest);

        await followRepo.save(
          followRepo.create({
            follower_id: currentUser.id,
            following_id: targetUser.id,
          }),
        );

        await requestRepo.delete({ requester_id: currentUser.id, target_user_id: targetUser.id });

        createdNotification = await notificationService.createNotification(
          {
            userId: targetUser.id,
            type: 'follow',
            referenceId: currentUser.id,
            content: `${currentUser.full_name || currentUser.username} started following you.`,
          },
          { manager, emit: false },
        );
      });

      if (createdNotification) {
        notificationService.emitNotification(targetUser.id, createdNotification);
      }

      await this.invalidateCountCache([currentUser.id, targetUser.id]);
      await this.warmFollowerFeedAfterFollow(currentUser.id, targetUser.id);

      return {
        mode: 'followed',
        followStatus: 'following',
      };
    }

    let createdNotification: Awaited<ReturnType<typeof notificationService.createNotification>> | null = null;

    await AppDataSource.transaction(async (manager) => {
      const requestRepo = manager.getRepository(FollowRequest);

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

      createdNotification = await notificationService.createNotification(
        {
          userId: targetUser.id,
          type: 'follow_request',
          referenceId: currentUser.id,
          content: `${currentUser.full_name || currentUser.username} requested to follow you.`,
        },
        { manager, emit: false },
      );
    });

    if (createdNotification) {
      notificationService.emitNotification(targetUser.id, createdNotification);
    }

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

    if (result.mode === 'unfollowed') {
      try {
        await this.cleanupUnfollowedAuthorFromViewerFeed(currentUserId, targetUserId);
      } catch (error) {
        console.error('[follow] sync unfollow feed cleanup failed:', {
          viewerUserId: currentUserId,
          targetAuthorId: targetUserId,
          error,
        });
      }

      try {
        await enqueueUnfollowFeedCleanup({
          viewerUserId: currentUserId,
          targetAuthorId: targetUserId,
          unfollowedAtIso: new Date().toISOString(),
        });
      } catch (error) {
        console.error('[follow] enqueue unfollow feed cleanup failed:', {
          viewerUserId: currentUserId,
          targetAuthorId: targetUserId,
          error,
        });
      }
    }

    return result;
  }

  async acceptRequest(currentUserId: number, requesterId: number): Promise<FollowActionResult> {
    if (!Number.isFinite(currentUserId) || !Number.isFinite(requesterId)) {
      throw new BadRequestError('Invalid user id');
    }

    if (currentUserId === requesterId) {
      throw new BadRequestError('Invalid follow request');
    }

    const [currentUser] = await Promise.all([
      this.ensureUserExists(currentUserId),
      this.ensureUserExists(requesterId),
    ]);

    let createdNotification: Awaited<ReturnType<typeof notificationService.createNotification>> | null = null;

    await AppDataSource.transaction(async (manager) => {
      const followRepo = manager.getRepository(Follow);
      const requestRepo = manager.getRepository(FollowRequest);

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

      createdNotification = await notificationService.createNotification(
        {
          userId: requesterId,
          type: 'follow_accept',
          referenceId: currentUserId,
          content: `${currentUser.full_name || currentUser.username} accepted your follow request.`,
        },
        { manager, emit: false },
      );
    });

    if (createdNotification) {
      notificationService.emitNotification(requesterId, createdNotification);
    }

    await this.invalidateCountCache([currentUserId, requesterId]);
    await this.warmFollowerFeedAfterFollow(requesterId, currentUserId);

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
