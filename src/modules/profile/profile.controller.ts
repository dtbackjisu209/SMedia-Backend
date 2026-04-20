import type { Request, Response } from 'express';
import { BadRequestError } from '../../core/handler/error.response.js';
import type {
  ProfilePasswordChangeDto,
  ProfileSearchQueryDto,
  ProfileUpdateDto,
} from './profile.dto.js';
import profileService from './profile.service.js';

class ProfileController {
  private requireAuthUserId(req: Request): number {
    const userId = typeof req.userId === 'number' ? req.userId : Number(req.userId);
    if (!Number.isFinite(userId) || userId <= 0) {
      throw new BadRequestError('Invalid user id');
    }
    return userId;
  }

  search = async (req: Request, res: Response) => {
    const query = req.query as ProfileSearchQueryDto;
    const users = await profileService.searchUsers(query);
    return res.status(200).json({ success: true, data: users });
  };

  getProfile = async (req: Request, res: Response) => {
    const targetUserId = Number(req.params.userId);
    if (!Number.isFinite(targetUserId) || targetUserId <= 0) {
      throw new BadRequestError('Invalid user id');
    }

    const viewerUserId = typeof req.userId === 'number' ? req.userId : Number(req.userId);
    const profile = await profileService.getProfileByUserId(
      targetUserId,
      Number.isFinite(viewerUserId) ? viewerUserId : undefined,
    );

    return res.status(200).json({ success: true, data: profile });
  };

  updateMyProfile = async (req: Request, res: Response) => {
    const currentUserId = this.requireAuthUserId(req);
    const payload = req.body as ProfileUpdateDto;
    const profile = await profileService.updateMyProfile(currentUserId, payload);
    return res.status(200).json({ success: true, data: profile });
  };

  changeMyPassword = async (req: Request, res: Response) => {
    const currentUserId = this.requireAuthUserId(req);
    const payload = req.body as ProfilePasswordChangeDto;
    await profileService.changeMyPassword(currentUserId, payload);
    return res.status(200).json({ success: true, message: 'Password updated successfully' });
  };
}

export default new ProfileController();
