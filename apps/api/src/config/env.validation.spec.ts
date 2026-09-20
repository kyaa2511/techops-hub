import { validateEnvironment } from './env.validation';

const baseEnvironment = {
  NODE_ENV: 'development',
  PORT: '3000',
  APP_ORIGIN: 'http://localhost:5173',
  DATABASE_HOST: 'localhost',
  DATABASE_PORT: '5432',
  DATABASE_NAME: 'techops_hub',
  DATABASE_USER: 'techops_hub',
  DATABASE_PASSWORD: '',
  DATABASE_SSL: 'false',
  DATABASE_SSL_REJECT_UNAUTHORIZED: 'true',
  AUTH_PROVIDER: 'test',
};

describe('validateEnvironment', () => {
  it('allows an empty database password outside production', () => {
    expect(validateEnvironment(baseEnvironment).DATABASE_PASSWORD).toBe('');
  });

  it('rejects an empty database password in production', () => {
    expect(() => validateEnvironment({ ...baseEnvironment, NODE_ENV: 'production' })).toThrow(
      'Invalid environment configuration',
    );
  });

  it('accepts a database password in production', () => {
    expect(
      validateEnvironment({ ...baseEnvironment, NODE_ENV: 'production', DATABASE_PASSWORD: 'secret' }),
    ).toMatchObject({ NODE_ENV: 'production', DATABASE_PASSWORD: 'secret' });
  });
});