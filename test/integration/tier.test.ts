import request from 'supertest';
import app from '../../src/app';
import * as dbHandler from '../db-handler';
import User from '../../src/models/user.model';
import Tier from '../../src/models/tier.model';
import { UserRole, TierTitle } from '../../src/types/enums';

beforeAll(async () => {
  await dbHandler.connect();
});

afterAll(async () => {
  await dbHandler.closeDatabase();
});

afterEach(async () => {
  await dbHandler.clearDatabase();
});

const adminUser = {
  userName: 'Admin User',
  email: 'admin@example.com',
  password: 'password123',
  confirmPassword: 'password123',
};

const customerUser = {
  userName: 'Customer User',
  email: 'customer@example.com',
  password: 'password123',
  confirmPassword: 'password123',
};

async function getAdminToken() {
  await request(app).post('/api/v1/auth/register').send(adminUser);
  const user = await User.findOne({ email: adminUser.email });
  if (user) {
    user.role = UserRole.SystemAdmin;
    await user.save();
  }
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: adminUser.email, password: adminUser.password });
  return res.body.data.accessToken as string;
}

async function getCustomerToken() {
  await request(app).post('/api/v1/auth/register').send(customerUser);
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: customerUser.email, password: customerUser.password });
  return res.body.data.accessToken as string;
}

describe('Tier CRUD API Endpoints', () => {
  describe('POST /api/v1/tiers', () => {
    it('creates a subscription tier successfully as admin', async () => {
      const token = await getAdminToken();
      const res = await request(app)
        .post('/api/v1/tiers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: TierTitle.Plus,
          amount: 99000,
          noMonth: 1,
          limitedToken: 100,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(TierTitle.Plus);
      expect(res.body.data.amount).toBe(99000);
    });

    it('denies access to non-admin user', async () => {
      const token = await getCustomerToken();
      const res = await request(app)
        .post('/api/v1/tiers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: TierTitle.Pro,
          amount: 299000,
          noMonth: 1,
          limitedToken: 500,
        });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/tiers', () => {
    it('lists subscription tiers', async () => {
      await Tier.create({
        title: TierTitle.Free,
        amount: 0,
        noMonth: 12,
        limitedToken: 10,
        isActive: true,
      });

      const res = await request(app).get('/api/v1/tiers');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].title).toBe(TierTitle.Free);
    });
  });

  describe('GET /api/v1/tiers/:id', () => {
    it('retrieves a single tier by ID', async () => {
      const tier = await Tier.create({
        title: TierTitle.Pro,
        amount: 299000,
        noMonth: 1,
        limitedToken: 500,
        isActive: true,
      });

      const res = await request(app).get(`/api/v1/tiers/${tier._id}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(TierTitle.Pro);
    });
  });

  describe('PUT /api/v1/tiers/:id', () => {
    it('updates tier metadata as admin', async () => {
      const token = await getAdminToken();
      const tier = await Tier.create({
        title: TierTitle.Free,
        amount: 0,
        noMonth: 12,
        limitedToken: 10,
        isActive: true,
      });

      const res = await request(app)
        .put(`/api/v1/tiers/${tier._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 15000, limitedToken: 20 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.amount).toBe(15000);
      expect(res.body.data.limitedToken).toBe(20);
    });
  });

  describe('DELETE /api/v1/tiers/:id', () => {
    it('deactivates a tier successfully as admin', async () => {
      const token = await getAdminToken();
      const tier = await Tier.create({
        title: TierTitle.Free,
        amount: 0,
        noMonth: 12,
        limitedToken: 10,
        isActive: true,
      });

      const res = await request(app)
        .delete(`/api/v1/tiers/${tier._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const dbTier = await Tier.findById(tier._id);
      expect(dbTier?.isActive).toBe(false);
    });
  });

  describe('PATCH /api/v1/users/:id (Admin updating user tier)', () => {
    it('allows system admin to assign tierId to a user', async () => {
      const adminToken = await getAdminToken();
      
      // Register customer
      await request(app).post('/api/v1/auth/register').send(customerUser);
      const user = await User.findOne({ email: customerUser.email });
      expect(user).toBeDefined();

      // Create a new tier
      const tier = await Tier.create({
        title: TierTitle.Plus,
        amount: 99000,
        noMonth: 1,
        limitedToken: 100,
        isActive: true,
      });

      const res = await request(app)
        .patch(`/api/v1/users/${user!._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ tierId: tier._id.toString() });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tierId).toBe(tier._id.toString());
    });
  });
});
