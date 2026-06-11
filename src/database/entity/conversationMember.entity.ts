import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Conversation } from './conversation.entity.js';
import { User } from './user.entity.js';

@Entity('conversation_members')
export class ConversationMember {
  @PrimaryColumn({ type: 'bigint' })
  conversation_id!: number;

  @PrimaryColumn({ type: 'bigint' })
  user_id!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  nickname!: string | null;

  @Column({ type: 'datetime', nullable: true })
  muted_until!: Date | null;

  @Column({ type: 'boolean', default: false })
  muted_forever!: boolean;

  @Column({ type: 'datetime', nullable: true })
  last_read_at!: Date | null;

  @ManyToOne(() => Conversation)
  @JoinColumn({ name: 'conversation_id' })
  conversation!: Conversation;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
