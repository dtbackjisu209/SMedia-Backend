import { AppDataSource } from '../../data-source.js';
import { Story } from '../../database/entity/story.entity.js';
import { StoryHighlight } from '../../database/entity/storyHighlight.entity.js';
import { StoryHighlightItem } from '../../database/entity/storyHighlightItem.entity.js';
import { User } from '../../database/entity/user.entity.js';
import { Follow } from '../../database/entity/follow.entity.js';
import { cloudinary } from '../../core/config/cloudinary.js';
import { In, MoreThan } from 'typeorm';
import {
    BadRequestError,
    ConflictRequestError,
    ForbiddenError,
    NotFoundError,
} from '../../core/handler/error.response.js';
import notificationService from '../notification/notification.service.js';
import { normalizePublicAssetUrl } from '../../utils/publicAssetUrl.js';

class StoryService {
    private storyRepository = AppDataSource.getRepository(Story);
    private storyHighlightRepository = AppDataSource.getRepository(StoryHighlight);
    private storyHighlightItemRepository = AppDataSource.getRepository(StoryHighlightItem);
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
                    avatar_url: normalizePublicAssetUrl(s.user.avatar_url),
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

    public async getStoriesByUserId(userId: number) {
        const stories = await this.storyRepository.find({
            where: { user: { id: userId } },
            relations: ['user'],
            order: { created_at: 'DESC' },
        });

        return stories.map((story) => ({
            id: story.id,
            media_url: story.media_url,
            media_type: story.media_type,
            created_at: story.created_at,
            expires_at: story.expires_at,
        }));
    }

    public async getActiveStoriesByUserId(userId: number) {
        const now = new Date();
        const stories = await this.storyRepository.find({
            where: {
                user: { id: userId },
                expires_at: MoreThan(now),
            },
            relations: ['user'],
            order: { created_at: 'DESC' },
        });

        return stories.map((story) => ({
            id: story.id,
            media_url: story.media_url,
            media_type: story.media_type,
            created_at: story.created_at,
            expires_at: story.expires_at,
        }));
    }

    public async createHighlight(
        userId: number,
        payload: { title: string; storyIds?: Array<number | string> }
    ) {
        const title = String(payload.title ?? '').trim();
        if (!title) {
            throw new BadRequestError('Highlight title is required');
        }

        if (title.length > 100) {
            throw new BadRequestError('Highlight title must be 100 characters or fewer');
        }

        const storyIds = this.normalizeStoryIds(payload.storyIds ?? []);
        if (storyIds.length === 0) {
            throw new BadRequestError('Highlight must contain at least one story');
        }
        const stories = await this.getOwnedStories(userId, storyIds);
        console.log('[story-highlight] create:start', {
            userId,
            title,
            storyIds,
            resolvedStoryIds: stories.map((story) => story.id),
        });

        const highlight = this.storyHighlightRepository.create({
            user: { id: userId } as User,
            title,
            cover_media_url: stories[0]?.media_url ?? null,
        });

        const savedHighlight = await this.storyHighlightRepository.save(highlight);
        console.log('[story-highlight] create:highlight-saved', {
            highlightId: savedHighlight.id,
            cover_media_url: savedHighlight.cover_media_url,
        });

        if (stories.length > 0) {
            const values = stories.map((story) => ({
                    highlight_id: savedHighlight.id,
                    story_id: story.id,
                }));
            const insertResult = await this.storyHighlightItemRepository.insert(values);
            console.log('[story-highlight] create:items-inserted', {
                highlightId: savedHighlight.id,
                values,
                identifiers: insertResult.identifiers,
                generatedMaps: insertResult.generatedMaps,
                raw: insertResult.raw,
            });
        }

        return this.getHighlightDetailById(userId, savedHighlight.id);
    }

    public async updateHighlight(
        userId: number,
        highlightId: number,
        payload: { title: string }
    ) {
        const highlight = await this.getOwnedHighlight(userId, highlightId);
        const title = String(payload.title ?? '').trim();

        if (!title) {
            throw new BadRequestError('Highlight title is required');
        }

        if (title.length > 100) {
            throw new BadRequestError('Highlight title must be 100 characters or fewer');
        }

        highlight.title = title;
        await this.storyHighlightRepository.save(highlight);
        return this.getHighlightDetailById(userId, highlight.id);
    }

    public async getHighlightsByUserId(userId: number) {
        await this.storyHighlightRepository
            .createQueryBuilder()
            .delete()
            .from(StoryHighlight)
            .where('user_id = :userId', { userId })
            .andWhere(
                'id NOT IN (SELECT DISTINCT item.highlight_id FROM story_highlight_items item)',
            )
            .execute();

        const highlights = await this.storyHighlightRepository.find({
            where: { user: { id: userId } },
            order: { created_at: 'ASC' },
        });

        if (highlights.length === 0) {
            return [];
        }

        const items = await this.storyHighlightItemRepository.find({
            where: { highlight_id: In(highlights.map((highlight) => highlight.id)) },
            relations: ['story'],
            order: { added_at: 'ASC' },
        });

        const storiesByHighlightId = new Map<number, Story[]>();
        for (const item of items) {
            const existing = storiesByHighlightId.get(item.highlight_id) ?? [];
            existing.push(item.story);
            storiesByHighlightId.set(item.highlight_id, existing);
        }

        return highlights.map((highlight) => {
            const stories = storiesByHighlightId.get(highlight.id) ?? [];
            return {
                id: highlight.id,
                title: highlight.title,
                cover_media_url: highlight.cover_media_url ?? stories[0]?.media_url ?? null,
                created_at: highlight.created_at,
                story_count: stories.length,
                stories: stories.map((story) => ({
                    id: story.id,
                    media_url: story.media_url,
                    media_type: story.media_type,
                    created_at: story.created_at,
                    expires_at: story.expires_at,
                })),
            };
        }).filter((highlight) => highlight.story_count > 0);
    }

    public async addStoryToHighlight(userId: number, highlightId: number, storyId: number) {
        const highlight = await this.getOwnedHighlight(userId, highlightId);
        const story = await this.getOwnedStory(userId, storyId);

        const existingItem = await this.storyHighlightItemRepository.findOne({
            where: {
                highlight_id: highlight.id,
                story_id: story.id,
            },
        });

        if (existingItem) {
            throw new ConflictRequestError('Story already exists in this highlight');
        }

        const insertResult = await this.storyHighlightItemRepository.insert({
                highlight_id: highlight.id,
                story_id: story.id,
        });
        console.log('[story-highlight] add-story', {
            highlightId: highlight.id,
            storyId: story.id,
            identifiers: insertResult.identifiers,
            generatedMaps: insertResult.generatedMaps,
            raw: insertResult.raw,
        });

        if (!highlight.cover_media_url) {
            highlight.cover_media_url = story.media_url;
            await this.storyHighlightRepository.save(highlight);
        }

        return this.getHighlightDetailById(userId, highlight.id);
    }

    public async removeStoryFromHighlight(userId: number, highlightId: number, storyId: number) {
        const highlight = await this.getOwnedHighlight(userId, highlightId);
        const item = await this.storyHighlightItemRepository.findOne({
            where: {
                highlight_id: highlight.id,
                story_id: storyId,
            },
            relations: ['story'],
        });

        if (!item) {
            throw new NotFoundError('Story highlight item not found');
        }

        await this.storyHighlightItemRepository.remove(item);
        const remainingCount = await this.storyHighlightItemRepository.count({
            where: { highlight_id: highlight.id },
        });

        if (remainingCount === 0) {
            await this.storyHighlightRepository.remove(highlight);
            return null;
        }

        await this.refreshHighlightCover(highlight.id);
        return this.getHighlightDetailById(userId, highlight.id);
    }

    public async deleteHighlight(userId: number, highlightId: number) {
        const highlight = await this.getOwnedHighlight(userId, highlightId);
        await this.storyHighlightRepository.remove(highlight);
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

    private normalizeStoryIds(storyIds: Array<number | string>): number[] {
        const normalized = storyIds
            .map((storyId) => Number(storyId))
            .filter((storyId) => Number.isFinite(storyId) && storyId > 0);

        return Array.from(new Set(normalized));
    }

    private async getOwnedStories(userId: number, storyIds: number[]): Promise<Story[]> {
        if (storyIds.length === 0) {
            return [];
        }

        const stories = await this.storyRepository
            .createQueryBuilder('story')
            .leftJoinAndSelect('story.user', 'user')
            .where('story.id IN (:...storyIds)', { storyIds })
            .andWhere('user.id = :userId', { userId: Number(userId) })
            .getMany();

        console.log('[story-highlight] get-owned-stories', {
            userId,
            storyIds,
            matchedStoryIds: stories.map((story) => story.id),
        });

        if (stories.length !== storyIds.length) {
            throw new BadRequestError('One or more stories do not belong to the current user');
        }

        const storyMap = new Map(stories.map((story) => [Number(story.id), story]));
        return storyIds
            .map((storyId) => storyMap.get(Number(storyId)))
            .filter((story): story is Story => Boolean(story));
    }

    private async getOwnedStory(userId: number, storyId: number): Promise<Story> {
        const story = await this.storyRepository.findOne({
            where: { id: storyId },
            relations: ['user'],
        });

        if (!story) {
            throw new NotFoundError('Story not found');
        }

        if (Number(story.user.id) !== Number(userId)) {
            throw new ForbiddenError('You are not authorized to use this story');
        }

        return story;
    }

    private async getOwnedHighlight(userId: number, highlightId: number): Promise<StoryHighlight> {
        const highlight = await this.storyHighlightRepository.findOne({
            where: { id: highlightId },
            relations: ['user'],
        });

        if (!highlight) {
            throw new NotFoundError('Story highlight not found');
        }

        if (Number(highlight.user.id) !== Number(userId)) {
            throw new ForbiddenError('You are not authorized to access this highlight');
        }

        return highlight;
    }

    private async refreshHighlightCover(highlightId: number): Promise<void> {
        const highlight = await this.storyHighlightRepository.findOneBy({ id: highlightId });
        if (!highlight) {
            return;
        }

        const nextItem = await this.storyHighlightItemRepository.findOne({
            where: { highlight_id: highlightId },
            relations: ['story'],
            order: { added_at: 'ASC' },
        });

        highlight.cover_media_url = nextItem?.story.media_url ?? null;
        await this.storyHighlightRepository.save(highlight);
    }

    private async getHighlightDetailById(userId: number, highlightId: number) {
        const highlight = await this.storyHighlightRepository.findOne({
            where: {
                id: highlightId,
                user: { id: userId },
            },
            relations: ['user'],
        });

        if (!highlight) {
            throw new NotFoundError('Story highlight not found');
        }

        const items = await this.storyHighlightItemRepository.find({
            where: { highlight_id: highlight.id },
            relations: ['story'],
            order: { added_at: 'ASC' },
        });

        const stories = items.map((item) => item.story);

        return {
            id: highlight.id,
            title: highlight.title,
            cover_media_url: highlight.cover_media_url ?? stories[0]?.media_url ?? null,
            created_at: highlight.created_at,
            story_count: stories.length,
            stories: stories.map((story) => ({
                id: story.id,
                media_url: story.media_url,
                media_type: story.media_type,
                created_at: story.created_at,
                expires_at: story.expires_at,
            })),
        };
    }
}

export default new StoryService();
