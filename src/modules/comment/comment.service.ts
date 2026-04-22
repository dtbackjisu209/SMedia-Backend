import { enqueueUserInteraction } from '../post/queues/user-interaction/user-interaction.producer.js';
import postRepository from '../post/post.repository.js';
import commentRepository from './comment.repository.js';
import type {
	CreateCommentResultDTO,
	CreateCommentServiceInputDTO,
} from './comment.dto.js';

class CommentService {
	public async createComment(payload: CreateCommentServiceInputDTO): Promise<CreateCommentResultDTO> {
		const result = await commentRepository.createComment(payload);

		const tags = await postRepository.getTagsByPostId(payload.postId);
		await enqueueUserInteraction(payload.userId, payload.postId, 'comment', tags);

		return result;
	}
}

export default new CommentService();
