import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Post } from './post.entity.js';

@Entity('post_media')
export class PostMedia {

  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @ManyToOne(() => Post, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post!: Post;

  @Column('text')
  media_url!: string;

  @Column({
    type: 'enum',
    enum: ['image', 'video'],
  })
  media_type!: 'image' | 'video';

  @Column({ type: 'int', default: 0 })
  position!: number;

}