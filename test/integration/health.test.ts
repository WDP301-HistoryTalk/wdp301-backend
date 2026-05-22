import request from 'supertest';
import app from '../../src/app';

describe('GET /health', () => {
  it('returns 200 with status success', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body.env).toBe('test');
  });
});

describe('GET /api/unknown', () => {
  it('returns 404 for undefined routes', async () => {
    const res = await request(app).get('/api/route-that-does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
