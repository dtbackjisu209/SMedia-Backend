import { Entity,PrimaryGeneratedColumn,Column,CreateDateColumn} from "typeorm";
@Entity('users')
export class User {
    @PrimaryGeneratedColumn({type:'bigint'})
    id!: number;
    
    @Column({type: 'varchar',length:30,unique:true})
    username!: string;

    @Column({type: 'varchar',length:255,unique:true})
    email!:string;
    
    @Column({type: 'varchar'})
    password_hash!:string;
    
    @Column({type: 'varchar',length:100,nullable:true})
    full_name!:string|null;
    
    @Column({type:'text',nullable:true})
    bio!:string|null;
    
    @Column({type:'text',nullable:true})
    avatar_url!:string|null;
    
    @Column({type: 'boolean',default:false})
    is_verified!:boolean;
    
    @Column({type: 'boolean',default:false})
    is_private!: boolean;

    @CreateDateColumn({type: 'timestamp'})
     created_at!: Date;




}
