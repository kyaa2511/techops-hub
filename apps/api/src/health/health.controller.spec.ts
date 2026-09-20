import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  it('returns database-connected health status', async () => {
    const check = jest.fn(async () => ({
      status: 'ok' as const,
      database: 'connected' as const,
      timestamp: '2026-09-19T00:00:00.000Z',
    }));

    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: { check },
        },
      ],
    }).compile();

    const controller = moduleRef.get(HealthController);

    await expect(controller.check()).resolves.toEqual({
      status: 'ok',
      database: 'connected',
      timestamp: '2026-09-19T00:00:00.000Z',
    });
    expect(check).toHaveBeenCalledTimes(1);
  });
});
