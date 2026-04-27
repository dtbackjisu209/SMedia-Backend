import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity.js';

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column('text', { nullable: true })
  caption!: string | null;

  @Column({type: 'varchar', length: 255, nullable: true })
  location!: string | null;

  @CreateDateColumn({type: 'timestamp'})
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp', nullable: true })
  updated_at!: Date | null;

  @Column({ type: 'int', default: 0 })
  like_count!: number;

  @Column({ type: 'int', default: 0 })
  comment_count!: number;
}
