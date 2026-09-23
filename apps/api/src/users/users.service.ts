import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import type { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @Inject('UserRepository')
    private readonly usersRepository: Repository<User>,
  ) {}

  async findByClerkUserId(clerkUserId: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { clerkUserId },
    });

    if (!user) {
      throw new NotFoundException('Authenticated user was not found');
    }

    return user;
  }
}
