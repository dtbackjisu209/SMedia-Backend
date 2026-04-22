import type { NotificationType } from '../../database/entity/notification.entity.js';

 
export type CreateNotificationDto = {
  userId: number;
  type: NotificationType;
  content: string;
  referenceId?: number | null;
};

export interface NotificationItemDto {
  id: number;
  type: NotificationType;
  content: string;
  reference_id: number | null;
  is_read: boolean;
  created_at: Date;
};

export type NotificationListQueryDto = {
  limit?: number | string;
};


export interface NotificationSummaryDto {
  unreadCount: number;
}

export type MarkConversationNotificationsReadDto = {
  conversationId: number;
};

