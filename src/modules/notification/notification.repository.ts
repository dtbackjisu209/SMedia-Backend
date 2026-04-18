import type { EntityManager, Repository } from 'typeorm';
import { AppDataSource } from '../../data-source.js';
import { Notification } from '../../database/entity/notification.entity.js';
import { User } from '../../database/entity/user.entity.js';
import type { CreateNotificationDto } from './notification.dto.js';

class Notificationrepository {
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
    });

    return repo.save(entity);
  }

  async listByUserId(userId: number, limit: number): Promise<Notification[]> {
    return this.repo.find({
      where: { user: { id: userId } },
      order: { created_at: 'DESC' },
      take: limit,
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

  async countUnread(userId: number): Promise<number> {
    return this.repo.count({
      where: {
        user: { id: userId },
        is_read: false,
      },
    });
  }
}

export default new Notificationrepository();
