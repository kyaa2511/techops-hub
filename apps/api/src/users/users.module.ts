import { Module } from '@nestjs/common';
import { clerkClient } from '@clerk/express';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [
    UsersService,
    {
      provide: 'ClerkUserProfileClient',
      useValue: clerkClient,
    },
  ],
  exports: [TypeOrmModule, UsersService],
})
export class UsersModule {}
