import {Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn} from 'typeorm';
import { User } from './user.model.js';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({
    type: 'enum',
    enum: ['like', 'comment', 'follow', 'mention', 'story_view'],
  })
  type!: string;

  @Column({ type: 'bigint', nullable: true })
  reference_id!: number;

  @Column({ default: false })
  is_read!: boolean;

  @CreateDateColumn({type: 'timestamp'})
  created_at!: Date;
}
