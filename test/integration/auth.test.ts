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

describe('POST /api/v1/auth/register', () => {
  it('registers a new user and returns 200 with success message', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(validUser);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body.data).toHaveProperty('message');
  });

  it('returns 400 on missing fields', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ email: 'bad' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when passwords do not match', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validUser, confirmPassword: 'different' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 409 when email already registered', async () => {
    await request(app).post('/api/v1/auth/register').send(validUser);
    const res = await request(app).post('/api/v1/auth/register').send(validUser);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/v1/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/v1/auth/register').send(validUser);
  });

  it('returns 200 with accessToken, refreshToken, uid, userName, role', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: validUser.email, password: validUser.password });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
    expect(res.body.data).toHaveProperty('uid');
    expect(res.body.data).toHaveProperty('userName', validUser.userName);
    expect(res.body.data).toHaveProperty('role', 'CUSTOMER');
    expect(res.body.data).toHaveProperty('tokenType', 'Bearer');
    expect(res.body.data).toHaveProperty('expiresIn');
  });

  it('returns 401 on wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: validUser.email, password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 on missing fields', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({});

    expect(res.status).toBe(400);
  });
});

describe('POST /api/v1/auth/logout', () => {
  let accessToken: string;

  beforeEach(async () => {
    await request(app).post('/api/v1/auth/register').send(validUser);
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: validUser.email, password: validUser.password });
    accessToken = loginRes.body.data.accessToken;
  });

  it('logs out and returns 200', async () => {
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).post('/api/v1/auth/logout');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/users/me', () => {
  let accessToken: string;

  beforeEach(async () => {
    await request(app).post('/api/v1/auth/register').send(validUser);
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: validUser.email, password: validUser.password });
    accessToken = loginRes.body.data.accessToken;
  });

  it('returns profile for authenticated user', async () => {
    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(validUser.email);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/users/me');
    expect(res.status).toBe(401);
  });
});
