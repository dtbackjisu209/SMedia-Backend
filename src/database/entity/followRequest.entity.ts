import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity.js';

export type FollowRequestStatus = 'pending' | 'accepted' | 'rejected';

@Entity('follow_requests')
@Index(['requester_id', 'target_user_id'], { unique: true })
export class FollowRequest {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ type: 'bigint' })
  requester_id!: number;

  @Column({ type: 'bigint' })
  target_user_id!: number;

  @Column({
    type: 'enum',
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending',
  })
  status!: FollowRequestStatus;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'requester_id' })
  requester!: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'target_user_id' })
  targetUser!: User;
}

