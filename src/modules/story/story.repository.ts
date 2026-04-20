import { AppDataSource } from '../../data-source.js';
import { NotFoundError } from '../../core/handler/error.response.js';
import { Story } from '../../database/entity/story.entity.js';
import { User } from '../../database/entity/user.entity.js';
import type { PersistStoryInputDTO } from './story.dto.js';

class StoryRepository {
	public async createStory(payload: PersistStoryInputDTO): Promise<Story> {
		const userRepo = AppDataSource.getRepository(User);
		const storyRepo = AppDataSource.getRepository(Story);

		const user = await userRepo.findOneBy({ id: payload.userId });
		if (!user) {
			throw new NotFoundError(`User not found with id ${payload.userId}`);
		}

		const story = new Story();
		story.user = user;
		story.media_url = payload.media_url;
		story.media_type = payload.media_type;
		story.expires_at = payload.expires_at;

		return storyRepo.save(story);
	}

	public async getStoryFeed(userId: number): Promise<any[]> {
		const storyRepo = AppDataSource.getRepository(Story);
		const stories = await storyRepo
			.createQueryBuilder('story')
			.leftJoinAndSelect('story.user', 'user')
			.where('story.expires_at > :now', { now: new Date() })
			.orderBy('story.created_at', 'DESC')
			.getMany();

		// Group by user
		const groupedByUser = stories.reduce((acc: any, story) => {
			const existingUser = acc.find((u: any) => u.userId === story.user.id);
			if (existingUser) {
				existingUser.stories.push({
					id: story.id,
					media_url: story.media_url,
					media_type: story.media_type,
					created_at: story.created_at,
				});
			} else {
				acc.push({
					userId: story.user.id,
					username: story.user.username,
					avatar_url: story.user.avatar_url,
					stories: [
						{
							id: story.id,
							media_url: story.media_url,
							media_type: story.media_type,
							created_at: story.created_at,
						},
					],
				});
			}
			return acc;
		}, []);

		return groupedByUser;
	}
}

export default new StoryRepository();
