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
  name: 'Test User',
  email: 'test@example.com',
  password: 'password123',
};

describe('POST /api/v1/users/register', () => {
  it('registers a new user and returns 201 with token', async () => {
    const res = await request(app).post('/api/v1/users/register').send(validUser);

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user).not.toHaveProperty('password');
    expect(res.body.data.user.email).toBe(validUser.email);
  });

  it('returns 400 on invalid payload (missing fields)', async () => {
    const res = await request(app).post('/api/v1/users/register').send({ email: 'bad' });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('fail');
  });

  it('returns 409 when email already registered', async () => {
    await request(app).post('/api/v1/users/register').send(validUser);
    const res = await request(app).post('/api/v1/users/register').send(validUser);

    expect(res.status).toBe(409);
  });
});

describe('POST /api/v1/users/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/v1/users/register').send(validUser);
  });

  it('returns 200 with token on valid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/users/login')
      .send({ email: validUser.email, password: validUser.password });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('token');
  });

  it('returns 401 on wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/users/login')
      .send({ email: validUser.email, password: 'wrong-password' });

    expect(res.status).toBe(401);
  });

  it('returns 400 on missing fields', async () => {
    const res = await request(app).post('/api/v1/users/login').send({});

    expect(res.status).toBe(400);
  });
});

describe('GET /api/v1/users/profile', () => {
  let token: string;

  beforeEach(async () => {
    const res = await request(app).post('/api/v1/users/register').send(validUser);
    token = res.body.data.token;
  });

  it('returns profile for authenticated user', async () => {
    const res = await request(app)
      .get('/api/v1/users/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('user');
    expect(res.body.data.user.email).toBe(validUser.email);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/users/profile');

    expect(res.status).toBe(401);
  });

  it('returns 401 with invalid token', async () => {
    const res = await request(app)
      .get('/api/v1/users/profile')
      .set('Authorization', 'Bearer invalid.jwt.token');

    expect(res.status).toBe(401);
  });
});
