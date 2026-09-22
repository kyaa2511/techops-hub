import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { resolve } from 'node:path';
import { validateEnvironment } from './config/env.validation';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { MembershipsModule } from './memberships/memberships.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: [resolve(process.cwd(), '../../.env'), resolve(process.cwd(), '.env')],
      validate: validateEnvironment,
    }),
    DatabaseModule,
    AuthModule,
    HealthModule,
    UsersModule,
    OrganizationsModule,
    MembershipsModule,
  ],
})
export class AppModule {}
