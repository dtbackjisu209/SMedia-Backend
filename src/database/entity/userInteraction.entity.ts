import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryGeneratedColumn,
} from 'typeorm';
import { Post } from './post.entity.js';
import { User } from './user.entity.js';

export type UserInteractionType = 'like' | 'comment' | 'view';

@Entity('user_interactions')
@Index(['user_id', 'created_at'])
@Index(['post_id', 'created_at'])
export class UserInteraction {
	@PrimaryGeneratedColumn({ type: 'bigint' })
	id!: number;

	@Column({ type: 'bigint' })
	user_id!: number;

	@ManyToOne(() => User, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'user_id' })
	user!: User;

	@Column({ type: 'bigint' })
	post_id!: number;

	@ManyToOne(() => Post, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'post_id' })
	post!: Post;

	@Column({ type: 'varchar', length: 20 })
	type!: UserInteractionType;

	@Column({ type: 'json' })
	tag_snapshot!: string[];

	@CreateDateColumn({ type: 'timestamp' })
	created_at!: Date;
}
