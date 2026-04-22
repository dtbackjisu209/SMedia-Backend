import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from './user.entity.js';

@Entity('stories')
export class Story {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column('text')
  media_url!: string;

  @Column({
    type: 'enum',
    enum: ['image', 'video'],
  })
  media_type!: 'image' | 'video';

  @Column({ type: 'timestamp' })
  expires_at!: Date;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;
}