import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('hashtags')
export class Hashtag {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({type: 'varchar', length: 50, unique: true })
  name!: string;
}
