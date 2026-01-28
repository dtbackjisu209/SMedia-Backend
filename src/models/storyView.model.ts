import { Entity, PrimaryColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Story } from './story.model.js';
import { User } from './user.model.js';

@Entity('story_views')
export class StoryView {
  @PrimaryColumn({ type: 'bigint' })
  story_id!: number;

  @PrimaryColumn({ type: 'bigint' })
  user_id!: number;

  @ManyToOne(() => Story)
  @JoinColumn({ name: 'story_id' })
  story!: Story;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @CreateDateColumn()
  viewed_at!: Date;
}
