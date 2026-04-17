import { In } from 'typeorm';
import { AppDataSource } from '../../data-source.js';
import { Follow } from '../../database/entity/follow.entity.js';
import { FollowRequest } from '../../database/entity/followRequest.entity.js';
import { Post } from '../../database/entity/post.entity.js';
import { PostMedia } from '../../database/entity/postMedia.entity.js';
import { User } from '../../database/entity/user.entity.js';

class ProfileRepository {
  private userRepo = AppDataSource.getRepository(User);
  private followRepo = AppDataSource.getRepository(Follow);
  private followRequestRepo = AppDataSource.getRepository(FollowRequest);
  private postRepo = AppDataSource.getRepository(Post);
  private postMediaRepo = AppDataSource.getRepository(PostMedia);

  findUserById(userId: number): Promise<User | null> {
    return this.userRepo.findOne({ where: { id: userId } });
  }

  findUserByUsername(username: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { username } });
  }

  saveUser(user: User): Promise<User> {
    return this.userRepo.save(user);
  }

  async searchUsers(keyword: string, limit: number): Promise<User[]> {
    return this.userRepo
      .createQueryBuilder('user')
      .where('LOWER(user.username) LIKE :keyword OR LOWER(user.full_name) LIKE :keyword', {
        keyword: `%${keyword.toLowerCase()}%`,
      })
      .orderBy('user.created_at', 'DESC')
      .limit(limit)
      .getMany();
  }

  countFollowers(userId: number): Promise<number> {
    return this.followRepo.count({ where: { following_id: userId } });
  }

  countFollowing(userId: number): Promise<number> {
    return this.followRepo.count({ where: { follower_id: userId } });
  }

  countPosts(userId: number): Promise<number> {
    return this.postRepo.count({ where: { user: { id: userId } } });
  }

  findFollow(viewerUserId: number, targetUserId: number): Promise<Follow | null> {
    return this.followRepo.findOne({
      where: {
        follower_id: viewerUserId,
        following_id: targetUserId,
      },
    });
  }

  findPendingFollowRequest(viewerUserId: number, targetUserId: number): Promise<FollowRequest | null> {
    return this.followRequestRepo.findOne({
      where: {
        requester_id: viewerUserId,
        target_user_id: targetUserId,
        status: 'pending',
      },
    });
  }

  async findPostsByUserId(userId: number): Promise<Post[]> {
    return this.postRepo.find({
      where: { user: { id: userId } },
      relations: ['user'],
      order: { created_at: 'DESC' },
    });
  }

  async findMediaByPostIds(postIds: number[]): Promise<PostMedia[]> {
    if (postIds.length === 0) return [];
    return this.postMediaRepo.find({
      where: {
        post: {
          id: In(postIds),
        },
      },
      relations: ['post'],
      order: {
        position: 'ASC',
      },
    });
  }
}

export default new ProfileRepository();
