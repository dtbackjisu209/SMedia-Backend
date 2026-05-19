import bcrypt from 'bcrypt';
import { BadRequestError, NotFoundError } from '../../core/handler/error.response.js';
import type {
  ProfilePasswordChangeDto,
  ProfileSearchQueryDto,
  ProfileUpdateDto,
  ProfileUserSummaryDto,
  ProfileViewDto,
} from './profile.dto.js';
import profileRepository from './profile.repository.js';

class ProfileService {
  async searchUsers(query: ProfileSearchQueryDto): Promise<ProfileUserSummaryDto[]> {
    const keyword = String(query.q ?? '').trim();
    if (keyword.length === 0) return [];

    const limitValue = Number(query.limit ?? 8);
    const limit = Number.isFinite(limitValue) && limitValue > 0 ? Math.min(limitValue, 20) : 8;
    const users = await profileRepository.searchUsers(keyword, limit);

    return users.map((user) => ({
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      is_private: user.is_private,
    }));
  }

  async getProfileByUserId(targetUserId: number, viewerUserId?: number): Promise<ProfileViewDto> {
    if (!Number.isFinite(targetUserId) || targetUserId <= 0) {
      throw new BadRequestError('Invalid user id');
    }

    const user = await profileRepository.findUserById(targetUserId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const posts = await profileRepository.findPostsByUserId(targetUserId);
    const media = await profileRepository.findMediaByPostIds(posts.map((post) => post.id));
    const mediaByPostId = new Map<number, typeof media>();

    for (const item of media) {
      const postId = item.post.id;
      const existing = mediaByPostId.get(postId) ?? [];
      existing.push(item);
      mediaByPostId.set(postId, existing);
    }

    const [followerCount, followingCount, postCount] = await Promise.all([
      profileRepository.countFollowers(targetUserId),
      profileRepository.countFollowing(targetUserId),
      profileRepository.countPosts(targetUserId),
    ]);

    let isFollowing = false;
    let hasPendingRequest = false;

    if (viewerUserId && viewerUserId !== targetUserId) {
      const [follow, pendingRequest] = await Promise.all([
        profileRepository.findFollow(viewerUserId, targetUserId),
        profileRepository.findPendingFollowRequest(viewerUserId, targetUserId),
      ]);
      isFollowing = Boolean(follow);
      hasPendingRequest = Boolean(pendingRequest);
    }

    return {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      bio: user.bio,
      avatar_url: user.avatar_url,
      is_private: user.is_private,
      created_at: user.created_at,
      follower_count: followerCount,
      following_count: followingCount,
      post_count: postCount,
      is_following: isFollowing,
      has_pending_request: hasPendingRequest,
      posts: posts.map((post) => {
        const postMedia = mediaByPostId.get(post.id) ?? [];
        return {
          id: post.id,
          caption: post.caption,
          location: post.location,
          created_at: post.created_at,
          like_count: post.like_count,
          comment_count: post.comment_count,
          media_count: postMedia.length,
          thumbnail: postMedia[0]?.media_url ?? null,
          media: postMedia.map((item) => ({
            media_url: item.media_url,
            media_type: item.media_type,
            position: item.position,
          })),
        };
      }),
    };
  }

  async updateMyProfile(currentUserId: number, payload: ProfileUpdateDto): Promise<ProfileViewDto> {
    if (!Number.isFinite(currentUserId) || currentUserId <= 0) {
      throw new BadRequestError('Invalid user id');
    }

    const user = await profileRepository.findUserById(currentUserId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (typeof payload.username === 'string') {
      const username = payload.username.trim();
      if (username.length < 2 || username.length > 30) {
        throw new BadRequestError('username must be between 2 and 30 characters');
      }

      const existing = await profileRepository.findUserByUsername(username);
      const existingId = existing ? Number(existing.id) : null;
      const normalizedCurrentUserId = Number(currentUserId);

      if (
        existing &&
        Number.isFinite(existingId) &&
        Number.isFinite(normalizedCurrentUserId) &&
        existingId !== normalizedCurrentUserId
      ) {
        throw new BadRequestError('username already exists');
      }

      user.username = username;
    }

    if (payload.full_name !== undefined) {
      user.full_name = payload.full_name ? payload.full_name.trim() : null;
    }

    if (payload.bio !== undefined) {
      user.bio = payload.bio ? payload.bio.trim() : null;
    }

    if (payload.avatar_url !== undefined) {
      user.avatar_url = payload.avatar_url ? payload.avatar_url.trim() : null;
    }

    if (typeof payload.is_private === 'boolean') {
      user.is_private = payload.is_private;
    }

    await profileRepository.saveUser(user);
    return this.getProfileByUserId(currentUserId, currentUserId);
  }

  async changeMyPassword(currentUserId: number, payload: ProfilePasswordChangeDto): Promise<void> {
    const currentPassword = String(payload.current_password ?? '');
    const newPassword = String(payload.new_password ?? '');

    if (!currentPassword || !newPassword) {
      throw new BadRequestError('current_password and new_password are required');
    }

    if (newPassword.length < 6) {
      throw new BadRequestError('new_password must be at least 6 characters');
    }

    const user = await profileRepository.findUserById(currentUserId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      throw new BadRequestError('Current password is incorrect');
    }

    const salt = await bcrypt.genSalt(10);
    user.password_hash = await bcrypt.hash(newPassword, salt);
    await profileRepository.saveUser(user);
  }
}

export default new ProfileService();
