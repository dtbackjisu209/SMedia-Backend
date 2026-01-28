import {Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn} from 'typeorm';
import { Conversation } from './conversation.model.js';
import { User } from './user.model.js';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @ManyToOne(() => Conversation)
  @JoinColumn({ name: 'conversation_id' })
  conversation!: Conversation;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'sender_id' })
  sender!: User;

  @Column('text', { nullable: true })
  content!: string;

  @Column('text', { nullable: true })
  media_url!: string;

  @CreateDateColumn()
  created_at!: Date;
}
