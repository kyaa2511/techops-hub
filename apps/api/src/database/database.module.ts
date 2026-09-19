import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppEnvironment } from '../config/env.validation';
import { createTypeOrmModuleOptions } from './database.config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppEnvironment, true>) =>
        createTypeOrmModuleOptions({
          NODE_ENV: configService.get('NODE_ENV', { infer: true }),
          PORT: configService.get('PORT', { infer: true }),
          APP_ORIGIN: configService.get('APP_ORIGIN', { infer: true }),
          DATABASE_HOST: configService.get('DATABASE_HOST', { infer: true }),
          DATABASE_PORT: configService.get('DATABASE_PORT', { infer: true }),
          DATABASE_NAME: configService.get('DATABASE_NAME', { infer: true }),
          DATABASE_USER: configService.get('DATABASE_USER', { infer: true }),
          DATABASE_PASSWORD: configService.get('DATABASE_PASSWORD', { infer: true }),
          AUTH_PROVIDER: configService.get('AUTH_PROVIDER', { infer: true }),
        }),
    }),
  ],
})
export class DatabaseModule {}
