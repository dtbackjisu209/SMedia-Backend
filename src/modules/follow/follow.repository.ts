import { AppDataSource } from '../../data-source.js';
import { Follow } from '../../database/entity/follow.entity.js';
import { FollowRequest, type FollowRequestStatus } from '../../database/entity/followRequest.entity.js';
import { Notification } from '../../database/entity/notification.entity.js';
import { User } from '../../database/entity/user.entity.js';

type PageOptions = {
  skip: number;
  take: number;
};

export class FollowRepository {
  private userRepo = AppDataSource.getRepository(User);
  private followRepo = AppDataSource.getRepository(Follow);
  private followRequestRepo = AppDataSource.getRepository(FollowRequest);
  private notificationRepo = AppDataSource.getRepository(Notification);

  findUserById(userId: number) {
    return this.userRepo.findOne({ where: { id: userId } });
  }

  findFollow(followerId: number, followingId: number) {
    return this.followRepo.findOne({ where: { follower_id: followerId, following_id: followingId } });
  }

  findFollowRequest(requesterId: number, targetUserId: number) {
    return this.followRequestRepo.findOne({
      where: { requester_id: requesterId, target_user_id: targetUserId },
    });
  }

  findPendingFollowRequest(requesterId: number, targetUserId: number) {
    return this.followRequestRepo.findOne({
      where: {
        requester_id: requesterId,
        target_user_id: targetUserId,
        status: 'pending',
      },
    });
  }

  async saveFollow(followerId: number, followingId: number) {
    const follow = this.followRepo.create({
      follower_id: followerId,
      following_id: followingId,
    });

    return this.followRepo.save(follow);
  }

  async deleteFollow(followerId: number, followingId: number) {
    return this.followRepo.delete({ follower_id: followerId, following_id: followingId });
  }

  async saveFollowRequest(requesterId: number, targetUserId: number, status: FollowRequestStatus = 'pending') {
    const existing = await this.findFollowRequest(requesterId, targetUserId);

    if (existing) {
      existing.status = status;
      return this.followRequestRepo.save(existing);
    }

    return this.followRequestRepo.save(
      this.followRequestRepo.create({
        requester_id: requesterId,
        target_user_id: targetUserId,
        status,
      }),
    );
  }

  deleteFollowRequest(requesterId: number, targetUserId: number) {
    return this.followRequestRepo.delete({ requester_id: requesterId, target_user_id: targetUserId });
  }

  async createFollowNotification(userId: number, referenceId: number) {
    const notification = this.notificationRepo.create({
      user: { id: userId } as User,
      type: 'follow',
      reference_id: referenceId,
      is_read: false,
    });

    return this.notificationRepo.save(notification);
  }

  async listFollowers(userId: number, page: PageOptions) {
    const [rows, total] = await this.followRepo
      .createQueryBuilder('follow')
      .innerJoinAndSelect('follow.follower', 'user')
      .where('follow.following_id = :userId', { userId })
      .orderBy('follow.created_at', 'DESC')
      .skip(page.skip)
      .take(page.take)
      .getManyAndCount();

    return {
      total,
      users: rows.map((row) => row.follower),
    };
  }

  async listFollowing(userId: number, page: PageOptions) {
    const [rows, total] = await this.followRepo
      .createQueryBuilder('follow')
      .innerJoinAndSelect('follow.following', 'user')
      .where('follow.follower_id = :userId', { userId })
      .orderBy('follow.created_at', 'DESC')
      .skip(page.skip)
      .take(page.take)
      .getManyAndCount();

    return {
      total,
      users: rows.map((row) => row.following),
    };
  }

  countFollowers(userId: number) {
    return this.followRepo.count({ where: { following_id: userId } });
  }

  countFollowing(userId: number) {
    return this.followRepo.count({ where: { follower_id: userId } });
  }
}

export const getFollowerIdsByUserId = async (userId: number): Promise<number[]> => {
  const rows = await AppDataSource.getRepository(Follow)
    .createQueryBuilder('follow')
    .select('follow.follower_id', 'follower_id')
    .where('follow.following_id = :userId', { userId })
    .getRawMany<{ follower_id: string }>();

  return rows.map((row) => Number(row.follower_id));
};

export const getFollowingIdsByUserId = async (userId: number): Promise<number[]> => {
  const rows = await AppDataSource.getRepository(Follow)
    .createQueryBuilder('follow')
    .select('follow.following_id', 'following_id')
    .where('follow.follower_id = :userId', { userId })
    .getRawMany<{ following_id: string }>();

  return rows.map((row) => Number(row.following_id));
};

export default new FollowRepository();
