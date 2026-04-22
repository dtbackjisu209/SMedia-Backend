import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity.js';

@Entity('user_blocks')
export class UserBlock {
  @PrimaryColumn({ type: 'bigint' })
  blocker_id!: number;

  @PrimaryColumn({ type: 'bigint' })
  blocked_id!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'blocker_id' })
  blocker!: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'blocked_id' })
  blocked!: User;
}
