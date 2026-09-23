import { Module } from '@nestjs/common';
import { MembershipsModule } from '../memberships/memberships.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { AuthController } from './auth.controller';
import { ClerkAuthGuard } from './clerk-auth.guard';
import { TenantContextGuard } from './tenant-context.guard';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [MembershipsModule, OrganizationsModule, UsersModule],
  controllers: [AuthController],
  providers: [ClerkAuthGuard, TenantContextGuard],
})
export class AuthModule {}
