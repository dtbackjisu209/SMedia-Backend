import { CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { StoryHighlight } from './storyHighlight.entity.js';
import { Story } from './story.entity.js';

@Entity('story_highlight_items')
export class StoryHighlightItem {
  @PrimaryColumn({ type: 'bigint' })
  highlight_id!: number;

  @PrimaryColumn({ type: 'bigint' })
  story_id!: number;

  @ManyToOne(() => StoryHighlight)
  @JoinColumn({ name: 'highlight_id' })
  highlight!: StoryHighlight;

  @ManyToOne(() => Story)
  @JoinColumn({ name: 'story_id' })
  story!: Story;

  @CreateDateColumn({ type: 'timestamp' })
  added_at!: Date;
}
