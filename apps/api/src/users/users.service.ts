import {
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { QueryFailedError, Repository } from 'typeorm';
import type { User } from './user.entity';

export interface ClerkUserProfile {
  emailAddresses: Array<{ emailAddress: string }>;
  primaryEmailAddress?: { emailAddress: string } | null;
  firstName?: string | null;
  lastName?: string | null;
}

export interface ClerkUserProfileClient {
  users: {
    getUser(clerkUserId: string): Promise<ClerkUserProfile>;
  };
}

export interface ProvisionedUser {
  user: User;
  created: boolean;
}

@Injectable()
export class UsersService {
  constructor(
    @Inject('UserRepository')
    private readonly usersRepository: Repository<User>,
    @Inject('ClerkUserProfileClient')
    private readonly clerkClient: ClerkUserProfileClient,
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

  async provisionByClerkUserId(clerkUserId: string): Promise<ProvisionedUser> {
    const existingUser = await this.usersRepository.findOne({
      where: { clerkUserId },
    });

    if (existingUser) {
      return { user: existingUser, created: false };
    }

    const clerkUser = await this.clerkClient.users.getUser(clerkUserId);
    const email =
      clerkUser.primaryEmailAddress?.emailAddress ??
      clerkUser.emailAddresses[0]?.emailAddress;

    if (!email) {
      throw new UnprocessableEntityException(
        'Authenticated Clerk profile does not include an email address',
      );
    }

    const user = this.usersRepository.create({
      clerkUserId,
      email,
      firstName: clerkUser.firstName ?? null,
      lastName: clerkUser.lastName ?? null,
    });

    try {
      const savedUser = await this.usersRepository.save(user);
      return { user: savedUser, created: true };
    } catch (error) {
      if (!this.isClerkUserUniquenessConflict(error)) {
        throw error;
      }

      const concurrentUser = await this.usersRepository.findOne({
        where: { clerkUserId },
      });

      if (!concurrentUser) {
        throw error;
      }

      return { user: concurrentUser, created: false };
    }
  }

  private isClerkUserUniquenessConflict(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }

    const driverError = error.driverError as {
      code?: string;
      constraint?: string;
    };

    return (
      driverError.code === '23505' &&
      driverError.constraint === 'UQ_users_clerk_user_id'
    );
  }
}
