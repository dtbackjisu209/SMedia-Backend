import { Entity, PrimaryColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from './user.entity.js';
import { Post } from './post.entity.js';
@Entity('post_likes')
export class PostLike {
  @PrimaryColumn({ type: 'bigint' })
  user_id!: number;

  @PrimaryColumn({ type: 'bigint' })
  post_id!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Post)
  @JoinColumn({ name: 'post_id' })
  post!: Post;

  @CreateDateColumn()
  created_at!: Date;
}
