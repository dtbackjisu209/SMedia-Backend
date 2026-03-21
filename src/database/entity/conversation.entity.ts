import { Entity, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @CreateDateColumn({type: 'timestamp'})
  created_at!: Date;
}
