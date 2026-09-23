import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Membership } from './membership.entity';
import { MembershipsService } from './memberships.service';

@Module({
  imports: [TypeOrmModule.forFeature([Membership])],
  providers: [MembershipsService],
  exports: [TypeOrmModule, MembershipsService],
})
export class MembershipsModule {}
