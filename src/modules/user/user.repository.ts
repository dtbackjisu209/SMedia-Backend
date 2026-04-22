import { AppDataSource } from '../../data-source.js';
import { User } from '../../database/entity/user.entity.js';

class UserRepository {
  private userRepo = AppDataSource.getRepository(User);

  findById(userId: number): Promise<User | null> {
    return this.userRepo.findOne({ where: { id: userId } });
  }

  async searchByUsername(keyword: string, limit: number): Promise<User[]> {
    return this.userRepo
      .createQueryBuilder('user')
      .where('LOWER(user.username) LIKE :keyword', { keyword: `%${keyword.toLowerCase()}%` })
      .orderBy('user.created_at', 'DESC')
      .limit(limit)
      .getMany();
  }
}

export default new UserRepository();
