import {Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn} from 'typeorm';
import { User } from './user.model.js';

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
}
