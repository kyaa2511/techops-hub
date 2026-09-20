import Joi from 'joi';

export interface AppEnvironment {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
  APP_ORIGIN: string;
  DATABASE_HOST: string;
  DATABASE_PORT: number;
  DATABASE_NAME: string;
  DATABASE_USER: string;
  DATABASE_PASSWORD: string;
  DATABASE_SSL: boolean;
  DATABASE_SSL_REJECT_UNAUTHORIZED: boolean;
  AUTH_PROVIDER: 'clerk' | 'test';
  CLERK_PUBLISHABLE_KEY?: string;
  CLERK_SECRET_KEY?: string;
}

export const envValidationSchema = Joi.object<AppEnvironment>({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(3000),
  APP_ORIGIN: Joi.string()
    .required()
    .custom((value: string, helpers) => {
      const origins = value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);

      if (origins.length === 0) {
        return helpers.error('any.invalid');
      }

      for (const origin of origins) {
        const { error } = Joi.string()
          .uri({ scheme: ['http', 'https'] })
          .validate(origin);

        if (error) {
          return helpers.error('any.invalid');
        }
      }

      return value;
    }, 'comma separated origins')
    .messages({
      'any.invalid': 'APP_ORIGIN must contain one or more comma-separated http/https origins.',
    }),
  DATABASE_HOST: Joi.string().hostname().required(),
  DATABASE_PORT: Joi.number().port().required(),
  DATABASE_NAME: Joi.string().required(),
  DATABASE_USER: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().allow('').required(),
  DATABASE_SSL: Joi.boolean().default(false),
  DATABASE_SSL_REJECT_UNAUTHORIZED: Joi.boolean().default(true),
  AUTH_PROVIDER: Joi.string().valid('clerk', 'test').required(),
  CLERK_PUBLISHABLE_KEY: Joi.string().allow('').optional(),
  CLERK_SECRET_KEY: Joi.string().allow('').optional(),
}).unknown(true);

export function validateEnvironment(env: NodeJS.ProcessEnv): AppEnvironment {
  const { error, value } = envValidationSchema.validate(env, {
    abortEarly: false,
    convert: true,
  });

  if (error) {
    throw new Error(`Invalid environment configuration: ${error.message}`);
  }

  if (value.NODE_ENV === 'production' && value.DATABASE_PASSWORD === '') {
    throw new Error('Invalid environment configuration: DATABASE_PASSWORD is required in production.');
  }

  if (value.AUTH_PROVIDER === 'clerk') {
    if (!value.CLERK_PUBLISHABLE_KEY?.trim()) {
      throw new Error('Invalid environment configuration: CLERK_PUBLISHABLE_KEY is required when AUTH_PROVIDER=clerk.');
    }

    if (!value.CLERK_SECRET_KEY?.trim()) {
      throw new Error('Invalid environment configuration: CLERK_SECRET_KEY is required when AUTH_PROVIDER=clerk.');
    }
  }

  return value as AppEnvironment;
}
