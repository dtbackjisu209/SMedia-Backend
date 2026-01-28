import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Post } from './post.model.js';
import { Hashtag } from './hashtag.model.js';

@Entity('post_hashtags')
export class PostHashtag {
  @PrimaryColumn({ type: 'bigint' })
  post_id!: number;

  @PrimaryColumn({ type: 'bigint' })
  hashtag_id!: number;

  @ManyToOne(() => Post)
  @JoinColumn({ name: 'post_id' })
  post!: Post;

  @ManyToOne(() => Hashtag)
  @JoinColumn({ name: 'hashtag_id' })
  hashtag!: Hashtag;
}
