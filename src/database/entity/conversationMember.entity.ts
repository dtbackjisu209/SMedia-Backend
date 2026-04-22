import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Conversation } from './conversation.entity.js';
import { User } from './user.entity.js';

@Entity('conversation_members')
export class ConversationMember {
  @PrimaryColumn({ type: 'bigint' })
  conversation_id!: number;

  @PrimaryColumn({ type: 'bigint' })
  user_id!: number;

  @ManyToOne(() => Conversation)
  @JoinColumn({ name: 'conversation_id' })
  conversation!: Conversation;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
