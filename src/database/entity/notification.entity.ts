import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from './user.entity.js';

export const notificationTypes = [
  'like',
  'comment',
  'follow',
  'follow_request',
  'follow_accept',
  'message',
  'mention',
  'story_view',
  'new_post',
  'new_story',
] as const;

export type NotificationType = (typeof notificationTypes)[number];

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'actor_id' })
  actor!: User | null;

  @Column({
    type: 'enum',
    enum: notificationTypes,
  })
  type!: NotificationType;

  @Column({ type: 'text', nullable: true })
  content!: string | null;

  @Column({ type: 'bigint', nullable: true })
  reference_id!: number | null;

  @Column({ type: 'boolean', default: false })
  is_read!: boolean;

  @Column({ type: 'boolean', default: false })
  is_hidden!: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;
}
