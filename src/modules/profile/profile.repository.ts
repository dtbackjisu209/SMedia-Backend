import { In } from 'typeorm';
import { AppDataSource } from '../../data-source.js';
import { Follow } from '../../database/entity/follow.entity.js';
import { FollowRequest } from '../../database/entity/followRequest.entity.js';
import { Post } from '../../database/entity/post.entity.js';
import { PostMedia } from '../../database/entity/postMedia.entity.js';
import { StoryHighlight } from '../../database/entity/storyHighlight.entity.js';
import { StoryHighlightItem } from '../../database/entity/storyHighlightItem.entity.js';
import { User } from '../../database/entity/user.entity.js';

class ProfileRepository {
  private userRepo = AppDataSource.getRepository(User);
  private followRepo = AppDataSource.getRepository(Follow);
  private followRequestRepo = AppDataSource.getRepository(FollowRequest);
  private postRepo = AppDataSource.getRepository(Post);
  private postMediaRepo = AppDataSource.getRepository(PostMedia);
  private storyHighlightRepo = AppDataSource.getRepository(StoryHighlight);
  private storyHighlightItemRepo = AppDataSource.getRepository(StoryHighlightItem);

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

  async findHighlightsByUserId(userId: number): Promise<StoryHighlight[]> {
    return this.storyHighlightRepo
      .createQueryBuilder('highlight')
      .innerJoin(StoryHighlightItem, 'item', 'item.highlight_id = highlight.id')
      .where('highlight.user_id = :userId', { userId })
      .orderBy('highlight.created_at', 'ASC')
      .distinct(true)
      .getMany();
  }

  async findHighlightItemsByHighlightIds(highlightIds: number[]): Promise<StoryHighlightItem[]> {
    if (highlightIds.length === 0) return [];

    return this.storyHighlightItemRepo.find({
      where: {
        highlight_id: In(highlightIds),
      },
      relations: ['story', 'highlight'],
      order: {
        added_at: 'ASC',
      },
    });
  }
}

export default new ProfileRepository();
