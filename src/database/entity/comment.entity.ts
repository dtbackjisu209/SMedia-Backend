import {Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn} from 'typeorm';
import { User } from './user.entity.js';
import { Post } from './post.entity.js';

@Entity('comments')
export class Comment {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @ManyToOne(() => Post)
  @JoinColumn({ name: 'post_id' })
  post!: Post;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Comment, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent!: Comment;

  @Column('text')
  content!: string;

  @CreateDateColumn({type: 'timestamp'})
  created_at!: Date;
}
