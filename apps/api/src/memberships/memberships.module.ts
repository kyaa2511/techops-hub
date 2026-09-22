import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Membership } from './membership.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Membership])],
  exports: [TypeOrmModule],
})
export class MembershipsModule {}
