import type { Request, Response } from 'express';
import { BadRequestError } from '../../core/handler/error.response.js';
import type { MarkConversationNotificationsReadDto, NotificationListQueryDto } from './notification.dto.js';
import notificationService from './notification.service.js';

class NotificationController {
  private requireAuthUserId(req: Request & { userId?: number | string }): number {

    const userId = typeof req.userId === 'number' ? req.userId : Number(req.userId);
    if (!Number.isFinite(userId) || userId <= 0) {
      throw new BadRequestError('Invalid user id');
    }

    return userId;
  }

  getMine = async (req: Request & { userId?: number | string }, res: Response) => {

    const userId = this.requireAuthUserId(req);
    const query = req.query as NotificationListQueryDto;
    const notifications = await notificationService.getMyNotifications(userId, query);
    return res.status(200).json({ success: true, data: notifications });
  };

  getSummary = async (req: Request & { userId?: number | string }, res: Response) => {

    const userId = this.requireAuthUserId(req);
    const summary = await notificationService.getSummary(userId);
    return res.status(200).json({ success: true, data: summary });
  };

  markRead = async (req: Request & { userId?: number | string }, res: Response) => {

    const userId = this.requireAuthUserId(req);
    const notificationId = Number(req.params.notificationId);
    const result = await notificationService.markAsRead(userId, notificationId);
    return res.status(200).json({ success: true, data: result });
  };

  markAllRead = async (req: Request & { userId?: number | string }, res: Response) => {

    const userId = this.requireAuthUserId(req);
    const result = await notificationService.markAllRead(userId);
    return res.status(200).json({ success: true, data: result });
  };

  markConversationMessagesRead = async (req: Request & { userId?: number | string }, res: Response) => {

    const userId = this.requireAuthUserId(req);
    const payload = req.body as MarkConversationNotificationsReadDto;
    const result = await notificationService.markConversationMessagesRead(userId, Number(payload.conversationId));
    return res.status(200).json({ success: true, data: result });
  };

  clearRead = async (req: Request & { userId?: number | string }, res: Response) => {

    const userId = this.requireAuthUserId(req);
    const result = await notificationService.clearRead(userId);
    return res.status(200).json({ success: true, data: result });
  };
}

export default new NotificationController();
