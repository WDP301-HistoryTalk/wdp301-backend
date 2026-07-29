import request from 'supertest';
import app from '../../src/app';
import * as dbHandler from '../db-handler';
import { User, DailyQuest, UserQuestLog } from '../../src/models';
import { UserRole } from '../../src/types/enums';
import { GamificationService, todayKey } from '../../src/services/gamification.service';

beforeAll(async () => {
  await dbHandler.connect();
});

afterAll(async () => {
  await dbHandler.closeDatabase();
});

afterEach(async () => {
  await dbHandler.clearDatabase();
  GamificationService.invalidateDefsCache();
});

const staffUser = {
  userName: 'Staff User',
  email: 'staff@example.com',
  password: 'password123',
  confirmPassword: 'password123',
};

const customerUser = {
  userName: 'Customer User',
  email: 'customer@example.com',
  password: 'password123',
  confirmPassword: 'password123',
};

async function getStaffToken() {
  await request(app).post('/api/v1/auth/register').send(staffUser);
  const user = await User.findOne({ email: staffUser.email });
  if (user) {
    user.role = UserRole.ContentAdmin;
    await user.save();
  }
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: staffUser.email, password: staffUser.password });
  return res.body.data.accessToken as string;
}

async function getCustomerToken() {
  await request(app).post('/api/v1/auth/register').send(customerUser);
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: customerUser.email, password: customerUser.password });
  return res.body.data.accessToken as string;
}

describe('Staff Quest management (/staff/quests) — Read + Update only, no Create/Delete', () => {
  let staffToken: string;
  let customerToken: string;

  beforeEach(async () => {
    staffToken = await getStaffToken();
    customerToken = await getCustomerToken();
  });

  it('rejects access for a customer (not CONTENT_ADMIN/SYSTEM_ADMIN)', async () => {
    const res = await request(app)
      .get('/api/v1/staff/quests')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(403);
  });

  it('has no create endpoint — POST /staff/quests does not exist', async () => {
    const res = await request(app)
      .post('/api/v1/staff/quests')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ questId: 'chat_once', type: 'CHAT', title: 'A', target: 1, rewardTokens: 100 });

    expect(res.status).toBe(404);
    // Không quest nào được tạo trong DB
    expect(await DailyQuest.countDocuments()).toBe(0);
  });

  it('rejects an unknown quest type on update', async () => {
    const quest = await DailyQuest.create({ questId: 'chat_once', type: 'CHAT', title: 'A', target: 1, rewardTokens: 100 });

    const res = await request(app)
      .put(`/api/v1/staff/quests/${quest._id}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ type: 'SHARE' });

    expect(res.status).toBe(400);
  });

  it('lists all quests, including inactive ones', async () => {
    await DailyQuest.create({ questId: 'chat_once', type: 'CHAT', title: 'A', target: 1, rewardTokens: 100, isActive: true });
    await DailyQuest.create({ questId: 'quiz_once', type: 'QUIZ', title: 'B', target: 1, rewardTokens: 100, isActive: false });

    const res = await request(app)
      .get('/api/v1/staff/quests')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  it('updates a quest but keeps questId immutable', async () => {
    const quest = await DailyQuest.create({ questId: 'chat_once', type: 'CHAT', title: 'A', target: 1, rewardTokens: 100 });

    const res = await request(app)
      .put(`/api/v1/staff/quests/${quest._id}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ questId: 'hacked_id', title: 'Updated title', rewardTokens: 999 });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Updated title');
    expect(res.body.data.rewardTokens).toBe(999);
    expect(res.body.data.questId).toBe('chat_once'); // unchanged
  });

  it('rejects activating a quest that collides with another active quest of the same type', async () => {
    await DailyQuest.create({ questId: 'chat_once', type: 'CHAT', title: 'A', target: 1, rewardTokens: 100, isActive: true });
    const second = await DailyQuest.create({ questId: 'chat_twice', type: 'CHAT', title: 'B', target: 2, rewardTokens: 200, isActive: false });

    const res = await request(app)
      .put(`/api/v1/staff/quests/${second._id}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ isActive: true });

    expect(res.status).toBe(400);
  });

  it('has no delete endpoint — hiding a quest is done via isActive:false, keeping history intact', async () => {
    const quest = await DailyQuest.create({ questId: 'chat_once', type: 'CHAT', title: 'A', target: 1, rewardTokens: 100 });
    const customer = await User.findOne({ email: customerUser.email });
    await UserQuestLog.create({ uid: customer!._id, questId: 'chat_once', date: todayKey(), progress: 1 });

    const res = await request(app)
      .put(`/api/v1/staff/quests/${quest._id}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ isActive: false });

    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(false);
    // Vẫn còn trong DB, staff vẫn xem/bật lại được qua GET /staff/quests
    expect(await DailyQuest.findById(quest._id)).not.toBeNull();
    expect(await UserQuestLog.countDocuments({ questId: 'chat_once' })).toBe(1);

    const noRouteDelete = await request(app)
      .delete(`/api/v1/staff/quests/${quest._id}`)
      .set('Authorization', `Bearer ${staffToken}`);
    expect(noRouteDelete.status).toBe(404); // route không tồn tại (Express 404, không phải app-level 404 của controller)
  });

  it('returns 404 when updating a non-existent quest', async () => {
    const fakeId = '507f1f77bcf86cd799439011';
    const putRes = await request(app)
      .put(`/api/v1/staff/quests/${fakeId}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ title: 'X' });
    expect(putRes.status).toBe(404);
  });
});

describe('recordProgress() streak/quest decoupling', () => {
  it('still bumps the streak when no active quest matches the type', async () => {
    // Không tạo quest nào cả — getQuestDefs() sẽ tự seed 3 quest mặc định lần đầu.
    // Xoá hết ngay sau đó để mô phỏng "staff đã xoá hết quest loại CHAT".
    await GamificationService.getQuestDefs();
    await DailyQuest.deleteMany({ type: 'CHAT' });
    GamificationService.invalidateDefsCache();

    const user = await User.create({
      userName: 'Learner',
      email: 'learner@example.com',
      password: 'password123',
      role: UserRole.Customer,
    });

    await GamificationService.recordProgress(user.id, 'CHAT');

    const updated = await User.findById(user.id).select('streakCount lastStudyDate');
    expect(updated!.streakCount).toBe(1);
    expect(updated!.lastStudyDate).toBe(todayKey());

    // Không có quest CHAT active nào → không log tiến độ nào được ghi
    expect(await UserQuestLog.countDocuments({ uid: user.id })).toBe(0);
  });

  it('still bumps quest progress when a matching active quest exists', async () => {
    await DailyQuest.create({ questId: 'chat_once', type: 'CHAT', title: 'A', target: 1, rewardTokens: 100 });

    const user = await User.create({
      userName: 'Learner2',
      email: 'learner2@example.com',
      password: 'password123',
      role: UserRole.Customer,
    });

    await GamificationService.recordProgress(user.id, 'CHAT');

    const updated = await User.findById(user.id).select('streakCount');
    expect(updated!.streakCount).toBe(1);

    const log = await UserQuestLog.findOne({ uid: user.id, questId: 'chat_once' });
    expect(log?.progress).toBe(1);
  });
});
