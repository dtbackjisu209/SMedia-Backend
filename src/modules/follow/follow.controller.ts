import type { Request, Response } from 'express';
import { BadRequestError, AuthFailError } from '../../core/handler/error.response.js';
import followService from './follow.service.js';
import type {
  FollowActionPayload,
  FollowListQuery,
  FollowRequestDecisionPayload,
  FollowSuggestionQuery,
} from './follow.dto.js';

const parseId = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

class FollowController {
  private requireAuthUserId(req: Request): number {
    const userId = parseId(req.userId);
    if (userId === null) {
      throw new AuthFailError();
    }
    return userId;
  }

  private parseTargetUserId(req: Request): number {
    const payload = req.body as FollowActionPayload;
    const targetUserId = parseId(payload?.targetUserId);
    if (targetUserId === null) {
      throw new BadRequestError('targetUserId is required');
    }
    return targetUserId;
  }

  private parseRequesterId(req: Request): number {
    const payload = req.body as FollowRequestDecisionPayload;
    const requesterId = parseId(payload?.requesterId);
    if (requesterId === null) {
      throw new BadRequestError('requesterId is required');
    }
    return requesterId;
  }

  follow = async (req: Request, res: Response) => {
    const currentUserId = this.requireAuthUserId(req);
    const targetUserId = this.parseTargetUserId(req);

    const result = await followService.follow(currentUserId, targetUserId);
    return res.status(200).json({ success: true, data: result });
  };

  unfollow = async (req: Request, res: Response) => {
    const currentUserId = this.requireAuthUserId(req);
    const targetUserId = this.parseTargetUserId(req);

    const result = await followService.unfollow(currentUserId, targetUserId);
    return res.status(200).json({ success: true, data: result });
  };

  acceptRequest = async (req: Request, res: Response) => {
    const currentUserId = this.requireAuthUserId(req);
    const requesterId = this.parseRequesterId(req);

    const result = await followService.acceptRequest(currentUserId, requesterId);
    return res.status(200).json({ success: true, data: result });
  };

  rejectRequest = async (req: Request, res: Response) => {
    const currentUserId = this.requireAuthUserId(req);
    const requesterId = this.parseRequesterId(req);

    const result = await followService.rejectRequest(currentUserId, requesterId);
    return res.status(200).json({ success: true, data: result });
  };

  getFollowers = async (req: Request, res: Response) => {
    const userId = parseId(req.params.userId);
    if (userId === null) {
      throw new BadRequestError('Invalid userId');
    }

    const query = req.query as FollowListQuery;
    const result = await followService.getFollowers(userId, query);
    return res.status(200).json({ success: true, data: result });
  };

  getFollowing = async (req: Request, res: Response) => {
    const userId = parseId(req.params.userId);
    if (userId === null) {
      throw new BadRequestError('Invalid userId');
    }

    const query = req.query as FollowListQuery;
    const result = await followService.getFollowing(userId, query);
    return res.status(200).json({ success: true, data: result });
  };

  getFollowSuggestions = async (req: Request, res: Response) => {
    const currentUserId = this.requireAuthUserId(req);
    const query = req.query as FollowSuggestionQuery;

    const result = await followService.getFollowSuggestions(currentUserId, query);
    return res.status(200).json({ success: true, data: result });
  };
}

export default new FollowController();
