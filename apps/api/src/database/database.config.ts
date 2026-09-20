import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';
import { AppEnvironment } from '../config/env.validation';

export function createDataSourceOptions(env: AppEnvironment): DataSourceOptions {
  return {
    type: 'postgres',
    host: env.DATABASE_HOST,
    port: env.DATABASE_PORT,
    username: env.DATABASE_USER,
    password: env.DATABASE_PASSWORD,
    database: env.DATABASE_NAME,
    synchronize: false,
    migrationsRun: false,
    migrations: ['dist/database/migrations/*.js'],
    ssl: env.DATABASE_SSL
      ? {
          rejectUnauthorized: env.DATABASE_SSL_REJECT_UNAUTHORIZED,
        }
      : false,
  };
}

export function createTypeOrmModuleOptions(env: AppEnvironment): TypeOrmModuleOptions {
  return {
    ...createDataSourceOptions(env),
    autoLoadEntities: true,
  };
}
