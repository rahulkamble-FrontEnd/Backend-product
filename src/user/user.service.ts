import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  /**
   * Find all users
   */
  findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  /**
   * Find a single user by their ID
   */
  findOne(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  /**
   * Find a single user by their email
   */
  findOneByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  /**
   * Remove a user by ID
   */
  async remove(id: string): Promise<void> {
    await this.usersRepository.delete(id);
  }
}
