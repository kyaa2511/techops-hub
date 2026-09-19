import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';

describe('Health endpoint (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.APP_ORIGIN = 'http://localhost:5173,http://127.0.0.1:5173';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

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
      .expect(({ body }) => {
        expect(body).toMatchObject({
          status: 'ok',
          database: 'connected',
        });
        expect(body.timestamp).toEqual(expect.any(String));
      });
  });

  it('exposes swagger UI with the production bootstrap configuration', async () => {
    await request(app.getHttpServer()).get('/api/docs').expect(200);
  });
});
