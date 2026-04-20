import type { EntityManager } from 'typeorm';
import { BadRequestError } from '../../core/handler/error.response.js';
import type { Notification } from '../../database/entity/notification.entity.js';
import notificationRepository from './notification.repository.js';
import type { CreateNotificationDto, NotificationItemDto, NotificationListQueryDto } from './notification.dto.js';
import { emitNotificationToUser } from './notification.socket.js';

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

  async markAllRead(userId: number): Promise<{ unreadCount: number }> {
    await notificationRepository.markAllRead(userId);
    const unreadCount = await notificationRepository.countUnread(userId);
    return { unreadCount };
  }

  emitNotification(userId: number, item: NotificationItemDto): void {
    emitNotificationToUser(userId, item);
  }
}

export default new NotificationService();
