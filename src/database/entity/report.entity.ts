import {Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn} from 'typeorm';
import { User } from './user.entity.js';

@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reporter_id' })
  reporter!: User;

  @Column({
    type: 'enum',
    enum: ['user', 'post', 'comment'],
  })
  target_type!: string;

  @Column({ type: 'bigint' })
  target_id!: number;

  @Column('text', { nullable: true })
  reason!: string;

  @CreateDateColumn()
  created_at!: Date;
}
