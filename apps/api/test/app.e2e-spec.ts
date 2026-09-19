import { jest } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { configureApp } from '../src/bootstrap';
import { HealthController } from '../src/health/health.controller';
import { HealthService } from '../src/health/health.service';

describe('Health endpoint (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.APP_ORIGIN = 'http://localhost:5173,http://127.0.0.1:5173';

    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: {
            check: jest.fn(async () => ({
              status: 'ok' as const,
              database: 'connected' as const,
              timestamp: '2026-09-19T00:00:00.000Z',
            })),
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/v1/health (GET)', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect({
        status: 'ok',
        database: 'connected',
        timestamp: '2026-09-19T00:00:00.000Z',
      });
  });

  it('exposes swagger UI with the production bootstrap configuration', async () => {
    await request(app.getHttpServer()).get('/api/docs').expect(200);
  });
});
