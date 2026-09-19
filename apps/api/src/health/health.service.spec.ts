import { ServiceUnavailableException } from '@nestjs/common';
import { HealthService } from './health.service';

describe('HealthService', () => {
  it('returns success when the database query succeeds', async () => {
    const service = new HealthService({
      query: async () => [{ '?column?': 1 }],
    } as never);

    await expect(service.check()).resolves.toMatchObject({
      status: 'ok',
      database: 'connected',
    });
  });

  it('throws when the database query fails', async () => {
    const service = new HealthService({
      query: async () => Promise.reject(new Error('boom')),
    } as never);

    await expect(service.check()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
