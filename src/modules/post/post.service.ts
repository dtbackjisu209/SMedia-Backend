import { cloudinary } from '../../core/config/cloudinary.js';
import { env } from '../../core/config/env.js';
import { ensureRedisConnected, redisClient } from '../../core/config/redis.js';
import { redisKeys } from '../../core/config/rediskey.js';
import type {
	CloudinaryUploadSignatureDTO,
	CreatePostPayloadDTO,
	CreatePostResultDTO,
} from './post.dto.js';
import { getFollowerIdsByUserId } from '../follow/follow.repository.js';
import postRepository from './post.repository.js';

class PostService {
	public getUploadSignature(): CloudinaryUploadSignatureDTO {
		const timestamp = Math.floor(Date.now() / 1000);
		const signature = cloudinary.utils.api_sign_request(
			{
				folder: env.cloudinary.folder,
				timestamp,
			},
			env.cloudinary.apiSecret,
		);

		return {
			cloudName: env.cloudinary.cloudName,
			apiKey: env.cloudinary.apiKey,
			folder: env.cloudinary.folder,
			timestamp,
			signature,
		};
	}

	public async createPost(userId: number, payload: CreatePostPayloadDTO): Promise<CreatePostResultDTO> {
		const media = payload.media.map((item, index) => ({
			media_url: item.media_url,
			media_type: item.media_type,
			position: item.position ?? index,
		}));

		const savedPost = await postRepository.createPostWithMedia({
			userId,
			caption: payload.caption,
			location: payload.location,
			media,
		});

		const followerIds = await getFollowerIdsByUserId(userId);
		const feedUserIds = [...new Set([...followerIds, userId])];

		await ensureRedisConnected();

		const score = new Date(savedPost.created_at).getTime();
		const postIdValue = String(savedPost.id);

		const pipeline = redisClient.multi();
		for (const feedUserId of feedUserIds) {
			pipeline.zAdd(redisKeys.feed(feedUserId), {
				score,
				value: postIdValue,
			});
		}
		await pipeline.exec();

		const result: CreatePostResultDTO = {
			id: savedPost.id,
			caption: savedPost.caption,
			location: savedPost.location,
			created_at: savedPost.created_at,
		};
		return result;
	}
}

export default new PostService();

