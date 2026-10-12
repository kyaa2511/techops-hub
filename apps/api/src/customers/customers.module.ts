import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { MembershipsModule } from '../memberships/memberships.module';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { TenantContextGuard } from '../auth/tenant-context.guard';
import { Customer } from './customer.entity';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
@Module({
  imports: [
    TypeOrmModule.forFeature([Customer]),
    UsersModule,
    OrganizationsModule,
    MembershipsModule,
  ],
  controllers: [CustomersController],
  providers: [CustomersService, ClerkAuthGuard, TenantContextGuard],
})
export class CustomersModule {}
