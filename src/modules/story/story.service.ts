import { AppDataSource } from '../../data-source.js';
import { Story } from '../../database/entity/story.entity.js';
import { User } from '../../database/entity/user.entity.js';
import { Follow } from '../../database/entity/follow.entity.js';
import { cloudinary } from '../../core/config/cloudinary.js';
import { In, MoreThan } from 'typeorm';
import fs from 'fs';
import notificationService from '../notification/notification.service.js';

class StoryService {
    private storyRepository = AppDataSource.getRepository(Story);
    private userRepository = AppDataSource.getRepository(User);
    private followRepository = AppDataSource.getRepository(Follow);

    public async getStoryFeed(userId: number) {
        const followings = await this.followRepository.find({
            where: { follower: { id: userId } },
            relations: ['following']
        });
        const followingIds = followings.map(f => f.following.id);
        followingIds.push(userId);

        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const stories = await this.storyRepository.find({
            where: {
                user: { id: In(followingIds) },
                created_at: MoreThan(dayAgo)
            },
            relations: ['user'],
            order: { created_at: 'DESC' }
        });

        const userMap = new Map<number, any>();
        stories.forEach(s => {
            const uId = s.user.id;
            if (!userMap.has(uId)) {
                userMap.set(uId, {
                    userId: String(uId),
                    username: s.user.username,
                    avatar_url: s.user.avatar_url,
                    stories: []
                });
            }
            userMap.get(uId).stories.push({
                id: String(s.id),
                media_url: s.media_url,
                created_at: s.created_at,
                type: s.media_type
            });
        });

        return Array.from(userMap.values());
    }

    public async createStory(userId: number, file: Express.Multer.File) {
        const user = await this.userRepository.findOneBy({ id: userId });
        if (!user) throw new Error('User not found');

        const mediaType: 'image' | 'video' = file.mimetype.startsWith('video') ? 'video' : 'image';
        
        let mediaUrl = '';
        
        // 1. Upload to Cloudinary
        try {
            // Convert buffer to base64 if using memoryStorage
            const b64 = Buffer.from(file.buffer).toString('base64');
            const dataURI = "data:" + file.mimetype + ";base64," + b64;
            
            const uploadRes = await cloudinary.uploader.upload(dataURI, {
                resource_type: 'auto',
                folder: 'stories'
            });
            mediaUrl = uploadRes.secure_url;
        } catch (error) {
            console.error('Cloudinary upload error:', error);
            throw new Error('Failed to upload media to cloud');
        }

        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        const story = this.storyRepository.create({
            user,
            media_url: mediaUrl,
            media_type: mediaType,
            expires_at: expiresAt,
            created_at: new Date()
        });

        const savedStory = await this.storyRepository.save(story);
        await notificationService.notifyFollowersAboutNewStory(userId, savedStory.id);
        return savedStory;
    }

    public async deleteStory(userId: number, storyId: number) {
        const story = await this.storyRepository.findOne({
            where: { id: storyId },
            relations: ['user']
        });

        if (!story) throw new Error('Story not found');
        
        console.log('Delete attempt:', {
            requestUserId: userId,
            requestUserIdType: typeof userId,
            storyUserId: story.user.id,
            storyUserIdType: typeof story.user.id
        });

        if (Number(story.user.id) !== Number(userId)) {
            throw new Error('You are not authorized to delete this story');
        }

        await this.storyRepository.remove(story);
    }
}

export default new StoryService();
