import { AppDataSource } from '../data-source.js';
import type { CreatePostWithMediaInputDTO } from '../dtos/post.dto.js';
import { NotFoundError } from '../handler/error.response.js';
import { Post } from '../models/post.model.js';
import { PostMedia } from '../models/postMedia.model.js';
import { User } from '../models/user.model.js';

class PostRepository {
	public async createPostWithMedia(payload: CreatePostWithMediaInputDTO): Promise<Post> {
		const userRepo = AppDataSource.getRepository(User);
		const postRepo = AppDataSource.getRepository(Post);
		const postMediaRepo = AppDataSource.getRepository(PostMedia);

		const user = await userRepo.findOneBy({ id: payload.userId });
		if (!user) {
			throw new NotFoundError(`Post owner not found with user id ${payload.userId}`);
		}

		const post = new Post();
		post.user = user;
		post.caption = payload.caption ?? null;
		post.location = payload.location ?? null;

		const savedPost = await postRepo.save(post);

		if (payload.media.length > 0) {
			const mediaRows = payload.media.map((item) => {
				const media = new PostMedia();
				media.post = savedPost;
				media.media_url = item.media_url;
				media.media_type = item.media_type;
				media.position = item.position;
				return media;
			});

			await postMediaRepo.save(mediaRows);
		}

		return savedPost;
	}
}

export default new PostRepository();
