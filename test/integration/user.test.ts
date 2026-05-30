import request from 'supertest';
import app from '../../src/app';
import * as dbHandler from '../db-handler';

beforeAll(async () => {
  await dbHandler.connect();
});

afterAll(async () => {
  await dbHandler.closeDatabase();
});

afterEach(async () => {
  await dbHandler.clearDatabase();
});

const validUser = {
  userName: 'Test User',
  email: 'test@example.com',
  password: 'password123',
  confirmPassword: 'password123',
};

async function registerAndLogin() {
  await request(app).post('/api/v1/auth/register').send(validUser);
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: validUser.email, password: validUser.password });
  return res.body.data.accessToken as string;
}

describe('GET /api/v1/users/me', () => {
  it('returns profile for authenticated user', async () => {
    const token = await registerAndLogin();
    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body.data.email).toBe(validUser.email);
    expect(res.body.data).not.toHaveProperty('password');
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/users/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 with invalid token', async () => {
    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', 'Bearer invalid.jwt.token');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe('PATCH /api/v1/users/me', () => {
  it('updates userName and returns updated profile', async () => {
    const token = await registerAndLogin();
    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ userName: 'Updated Name' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.userName).toBe('Updated Name');
  });

  it('returns 401 without token', async () => {
    const res = await request(app)
      .patch('/api/v1/users/me')
      .send({ userName: 'No Auth' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
