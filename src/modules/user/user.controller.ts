import type { Request, Response } from 'express';
import { BadRequestError } from '../../core/handler/error.response.js';
import userService from './user.service.js';
import type { SearchUsersQueryDto } from './user.dto.js';

class UserController {
  searchUsers = async (req: Request, res: Response) => {
    const query = req.query as SearchUsersQueryDto;
    const users = await userService.searchUsers(query);

    return res.status(200).json({
      success: true,
      data: users,
    });
  };

  getUserProfile = async (req: Request, res: Response) => {
    const targetUserId = Number(req.params.id);
    if (!Number.isFinite(targetUserId)) {
      throw new BadRequestError('Invalid user id');
    }

    const viewerUserId = typeof req.userId === 'number' ? req.userId : Number(req.userId);
    const userProfile = await userService.getUserProfileById(
      targetUserId,
      Number.isFinite(viewerUserId) ? viewerUserId : undefined,
    );

    return res.status(200).json({
      success: true,
      data: userProfile,
    });
  };
}

export default new UserController();
