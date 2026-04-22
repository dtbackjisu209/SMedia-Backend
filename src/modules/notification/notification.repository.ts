import type { EntityManager, Repository } from 'typeorm';
import { AppDataSource } from '../../data-source.js';
import { Notification } from '../../database/entity/notification.entity.js';
import { User } from '../../database/entity/user.entity.js';
import type { CreateNotificationDto } from './notification.dto.js';

class NotificationRepository {
  private repo = AppDataSource.getRepository(Notification);

  private resolveRepo(manager?: EntityManager): Repository<Notification> {
    return manager ? manager.getRepository(Notification) : this.repo;
  }

  async createNotification(input: CreateNotificationDto, manager?: EntityManager): Promise<Notification> {
    const repo = this.resolveRepo(manager);
    const entity = repo.create({
      user: { id: input.userId } as User,
      type: input.type,
      content: input.content,
      reference_id: input.referenceId ?? null,
      is_read: false,
      is_hidden: false,
    });

    return repo.save(entity);
  }

  async listByUserId(userId: number, limit: number): Promise<Notification[]> {
    return this.repo.find({
      where: { user: { id: userId }, is_hidden: false },
      order: { created_at: 'DESC' },
      take: limit,
    });
  }

  async findByIdForUser(notificationId: number, userId: number): Promise<Notification | null> {
    return this.repo.findOne({
      where: {
        id: notificationId,
        user: { id: userId },
        is_hidden: false,
      },
    });
  }

  async markAllRead(userId: number): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(Notification)
      .set({ is_read: true })
      .where('user_id = :userId', { userId })
      .andWhere('is_read = :isRead', { isRead: false })
      .execute();
  }

  async save(notification: Notification): Promise<Notification> {
    return this.repo.save(notification);
  }

  async markMessageNotificationsReadByConversation(userId: number, conversationId: number): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(Notification)
      .set({ is_read: true })
      .where('user_id = :userId', { userId })
      .andWhere('type = :type', { type: 'message' })
      .andWhere('reference_id = :conversationId', { conversationId })
      .andWhere('is_read = :isRead', { isRead: false })
      .execute();
  }

  async hideReadByUserId(userId: number): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(Notification)
      .set({ is_hidden: true })
      .where('user_id = :userId', { userId })
      .andWhere('is_hidden = :isHidden', { isHidden: false })
      .andWhere('is_read = :isRead', { isRead: true })
      .execute();
  }

  async countUnread(userId: number): Promise<number> {
    return this.repo.count({
      where: {
        user: { id: userId },
        is_read: false,
        is_hidden: false,
      },
    });
  }
}

export default new NotificationRepository();
