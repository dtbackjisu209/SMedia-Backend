import {Entity,ManyToOne,JoinColumn,CreateDateColumn,PrimaryColumn} from 'typeorm';
import {User} from './user.model.js';
@Entity('follows')
export class Follow{
    @PrimaryColumn({type:'bigint'})
    
    follower_id!:number;
    
    @PrimaryColumn({ type: 'bigint' })
    
    following_id!: number;
    
    @ManyToOne(()=>User)
    
    @JoinColumn({name:'follower_id'})
    
    follower!:User;
    
    @ManyToOne(() => User)
    
    @JoinColumn({ name: 'following_id' })
    
    following!: User;
    
    @CreateDateColumn({type: 'timestamp'})
  
    created_at!: Date;



}