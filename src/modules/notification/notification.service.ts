import type { EntityManager } from 'typeorm';
import { BadRequestError, NotFoundError } from '../../core/handler/error.response.js';
import { AppDataSource } from '../../data-source.js';
import type { Notification } from '../../database/entity/notification.entity.js';
import { User } from '../../database/entity/user.entity.js';
import { getFollowerIdsByUserId } from '../follow/follow.repository.js';
import postRepository from '../post/post.repository.js';
import notificationRepository from './notification.repository.js';
import type {
  CreateNotificationDto,
  NotificationItemDto,
  NotificationListQueryDto,
  NotificationSummaryDto,
} from './notification.dto.js';
import { emitNotificationToUser } from './notification.socket.js';
import { normalizePublicAssetUrl } from '../../utils/publicAssetUrl.js';

const MAX_LIMIT = 100;

class NotificationService {
  private toItem(notification: Notification): NotificationItemDto {
    return {
      id: Number(notification.id),
      type: notification.type,
      content: notification.content ?? '',
      reference_id: notification.reference_id ? Number(notification.reference_id) : null,
      is_read: Boolean(notification.is_read),
      created_at: notification.created_at,
      actor: notification.actor
        ? {
            id: Number(notification.actor.id),
            username: notification.actor.username,
            full_name: notification.actor.full_name ?? null,
            avatar_url: normalizePublicAssetUrl(notification.actor.avatar_url),
          }
        : null,
    };
  }

  async createNotification(
    input: CreateNotificationDto,
    options?: { manager?: EntityManager; emit?: boolean },
  ): Promise<NotificationItemDto> {
    if (!Number.isFinite(input.userId) || input.userId <= 0) {
      throw new BadRequestError('Invalid notification user id');
    }

    const saved = await notificationRepository.createNotification(input, options?.manager);
    if (input.actorId) {
      const userRepo = options?.manager
        ? options.manager.getRepository(User)
        : AppDataSource.getRepository(User);
      const actor = await userRepo.findOne({
        where: { id: input.actorId },
        select: ['id', 'username', 'full_name', 'avatar_url'],
      });
      if (actor) {
        saved.actor = actor;
      }
    }
    const item = this.toItem(saved);

    if (options?.emit !== false) {
      emitNotificationToUser(input.userId, item);
    }

    return item;
  }

  async getMyNotifications(userId: number, query: NotificationListQueryDto): Promise<NotificationItemDto[]> {
    const requestedLimit = Number(query.limit ?? 30);
    const limit =
      Number.isFinite(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, MAX_LIMIT) : 30;

    const notifications = await notificationRepository.listByUserId(userId, limit);
    return notifications.map((item) => this.toItem(item));
  }

  async getSummary(userId: number): Promise<NotificationSummaryDto> {
    const unreadCount = await notificationRepository.countUnread(userId);
    return { unreadCount };
  }

  async markAsRead(userId: number, notificationId: number): Promise<NotificationSummaryDto> {
    if (!Number.isFinite(notificationId) || notificationId <= 0) {
      throw new BadRequestError('Invalid notification id');
    }

    const notification = await notificationRepository.findByIdForUser(notificationId, userId);
    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    if (!notification.is_read) {
      notification.is_read = true;
      await notificationRepository.save(notification);
    }

    const unreadCount = await notificationRepository.countUnread(userId);
    return { unreadCount };
  }

  async markAllRead(userId: number): Promise<NotificationSummaryDto> {
    await notificationRepository.markAllRead(userId);
    const unreadCount = await notificationRepository.countUnread(userId);
    return { unreadCount };
  }

  async markConversationMessagesRead(userId: number, conversationId: number): Promise<NotificationSummaryDto> {
    if (!Number.isFinite(conversationId) || conversationId <= 0) {
      throw new BadRequestError('Invalid conversation id');
    }

    await notificationRepository.markMessageNotificationsReadByConversation(userId, conversationId);
    const unreadCount = await notificationRepository.countUnread(userId);
    return { unreadCount };
  }

  async clearRead(userId: number): Promise<NotificationSummaryDto> {
    await notificationRepository.hideReadByUserId(userId);
    const unreadCount = await notificationRepository.countUnread(userId);
    return { unreadCount };
  }

  emitNotification(userId: number, item: NotificationItemDto): void {
    emitNotificationToUser(userId, item);
  }

  async notifyPostLiked(actorUserId: number, postId: number): Promise<void> {
    await this.notifyPostOwnerAboutInteraction(actorUserId, postId, {
      type: 'like',
      buildContent: (actorName) => `${actorName} liked your post.`,
    });
  }

  async notifyPostCommented(actorUserId: number, postId: number): Promise<void> {
    await this.notifyPostOwnerAboutInteraction(actorUserId, postId, {
      type: 'comment',
      buildContent: (actorName) => `${actorName} commented on your post.`,
    });
  }

  async notifyFollowersAboutNewPost(authorId: number, postId: number): Promise<void> {
    await this.notifyFollowers(authorId, {
      type: 'new_post',
      referenceId: postId,
      buildContent: (authorName) => `${authorName} shared a new post.`,
    });
  }

  async notifyFollowersAboutNewStory(authorId: number, storyId: number): Promise<void> {
    await this.notifyFollowers(authorId, {
      type: 'new_story',
      referenceId: storyId,
      buildContent: (authorName) => `${authorName} added a new story.`,
    });
  }

  async notifyPostRemovedForCommunityViolation(userId: number, postId: number): Promise<void> {
    await this.createNotification({
      userId,
      type: 'message',
      referenceId: postId,
      content: 'Bài viết của bạn vi phạm tiêu chuẩn cộng đồng và đã bị xóa.',
    });
  }

  async notifyStoryRemovedForCommunityViolation(userId: number, storyId: number): Promise<void> {
    await this.createNotification({
      userId,
      type: 'message',
      referenceId: storyId,
      content: 'Story của bạn vi phạm tiêu chuẩn cộng đồng và đã bị xóa.',
    });
  }

  private async notifyFollowers(
    authorId: number,
    input: {
      type: CreateNotificationDto['type'];
      referenceId: number;
      buildContent: (authorName: string) => string;
    },
  ): Promise<void> {
    if (!Number.isFinite(authorId) || authorId <= 0) {
      return;
    }

    const [author, followerIds] = await Promise.all([
      AppDataSource.getRepository(User).findOne({
        where: { id: authorId },
        select: ['id', 'username', 'full_name'],
      }),
      getFollowerIdsByUserId(authorId),
    ]);

    if (!author || followerIds.length === 0) {
      return;
    }

    const authorName = author.full_name || author.username;
    const content = input.buildContent(authorName);

    const items = followerIds.map((userId) =>
      this.createNotification({
        userId,
        actorId: author.id,
        type: input.type,
        referenceId: input.referenceId,
        content,
      }),
    );

    await Promise.all(items);
  }

  private async notifyPostOwnerAboutInteraction(
    actorUserId: number,
    postId: number,
    input: {
      type: Extract<CreateNotificationDto['type'], 'like' | 'comment'>;
      buildContent: (actorName: string) => string;
    },
  ): Promise<void> {
    if (!Number.isFinite(actorUserId) || actorUserId <= 0 || !Number.isFinite(postId) || postId <= 0) {
      return;
    }

    const [postOwnerId, actor] = await Promise.all([
      postRepository.getPostOwnerId(postId),
      AppDataSource.getRepository(User).findOne({
        where: { id: actorUserId },
        select: ['id', 'username', 'full_name'],
      }),
    ]);

    if (!postOwnerId || !actor || Number(postOwnerId) === Number(actorUserId)) {
      return;
    }

    await this.createNotification({
      userId: postOwnerId,
      actorId: actor.id,
      type: input.type,
      referenceId: postId,
      content: input.buildContent(actor.full_name || actor.username),
    });
  }
}

export default new NotificationService();
