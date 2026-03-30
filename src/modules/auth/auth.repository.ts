import { DataSource, Repository } from 'typeorm';
import { User } from '../../database/entity/user.entity.js';

export class AuthRepository extends Repository<User> {
    constructor(private dataSource: DataSource) {
        super(User, dataSource.createEntityManager());
    }

    async findByEmail(email: string): Promise<User | null> {
        return await this.findOne({ where: { email } });
    }

    async findByUsernameOrEmail(username: string, email: string): Promise<User | null> {
        return await this.findOne({
            where: [
                { username: username },
                { email: email }
            ]
        });
    }

    async createUser(userData: Partial<User>): Promise<User> {
        const user = this.create(userData);
        return await this.save(user);
    }
}