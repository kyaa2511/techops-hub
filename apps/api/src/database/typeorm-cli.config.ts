import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';
import { resolve } from 'node:path';
import { validateEnvironment } from '../config/env.validation';
import { createDataSourceOptions } from './database.config';

loadEnv({ path: resolve(process.cwd(), '../../.env') });
loadEnv();

const env = validateEnvironment(process.env);

export default new DataSource({
  ...createDataSourceOptions(env),
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
});
