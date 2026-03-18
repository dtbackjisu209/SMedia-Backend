import { AppDataSource } from '../data-source.js';
import { Follow } from '../models/follow.model.js';

export const getFollowerIdsByUserId = async (userId: number): Promise<number[]> => {
	const rows = await AppDataSource.getRepository(Follow)
		.createQueryBuilder('follow')
		.select('follow.follower_id', 'follower_id')
		.where('follow.following_id = :userId', { userId })
		.getRawMany<{ follower_id: string }>();

	return rows.map((row) => Number(row.follower_id));
};
