import type { Request, Response } from 'express';
import { BadRequestError } from '../../core/handler/error.response.js';
import type { NotificationListQueryDto } from './notification.dto.js';
import notificationService from './notification.service.js';

class NotificationController {
  private requireAuthUserId(req: Request): number {
    const userId = typeof req.userId === 'number' ? req.userId : Number(req.userId);
    if (!Number.isFinite(userId) || userId <= 0) {
      throw new BadRequestError('Invalid user id');
    }
    return userId;
  }

  getMine = async (req: Request, res: Response) => {
    const userId = this.requireAuthUserId(req);
    const query = req.query as NotificationListQueryDto;
    const notifications = await notificationService.getMyNotifications(userId, query);
    return res.status(200).json({ success: true, data: notifications });
  };

  markAllRead = async (req: Request, res: Response) => {
    const userId = this.requireAuthUserId(req);
    const result = await notificationService.markAllRead(userId);
    return res.status(200).json({ success: true, data: result });
  };
}

export default new NotificationController();
