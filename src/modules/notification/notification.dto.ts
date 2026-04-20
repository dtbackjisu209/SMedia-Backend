import type { NotificationType } from '../../database/entity/notification.entity.js';

export interface NotificationItemDto {
  id: number;
  type: NotificationType;
  content: string;
  reference_id: number | null;
  is_read: boolean;
  created_at: Date;
}

export interface NotificationListQueryDto {
  limit?: number;
}

export interface CreateNotificationDto {
  userId: number;
  type: NotificationType;
  content: string;
  referenceId?: number | null;
}
