import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Conversation } from './conversation.entity.js';
import { User } from './user.entity.js';

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

  @Column('text', { nullable: true })
  deleted_for_user_ids!: string | null;

  @Column({ type: 'boolean', default: false })
  is_recalled!: boolean;

  @ManyToOne(() => Message, { nullable: true })
  @JoinColumn({ name: 'reply_to_message_id' })
  reply_to_message!: Message | null;

  @Column('text', { nullable: true })
  reactions!: string | null;

  @CreateDateColumn()
  created_at!: Date;
}
