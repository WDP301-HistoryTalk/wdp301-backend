import request from 'supertest';
import app from '../../src/app';
import * as dbHandler from '../db-handler';
import { User, Quiz, Question, QuizSession, AnswerDetail, HistoricalContext } from '../../src/models';
import { UserRole, EventEra, EventCategory } from '../../src/types/enums';

beforeAll(async () => {
  await dbHandler.connect();
});

afterAll(async () => {
  await dbHandler.closeDatabase();
});

afterEach(async () => {
  await dbHandler.clearDatabase();
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

describe('Quiz API Operations (Staff & Customer)', () => {
  let contextId: string;
  let staffToken: string;
  let customerToken: string;

  beforeEach(async () => {
    staffToken = await getStaffToken();
    customerToken = await getCustomerToken();

    // Create a mock Historical Context
    const creator = await User.findOne({ email: staffUser.email });
    const context = await HistoricalContext.create({
      createdBy: creator!._id,
      name: 'Ngo Quyen pha quan Nam Han',
      description: 'Chien thang tren song Bach Dang nam 938',
      era: EventEra.Medieval,
      category: EventCategory.War,
      year: 938,
      location: 'Song Bach Dang',
    });
    contextId = context._id.toString();
  });

  describe('Staff Quiz CRUD', () => {
    it('creates a quiz with questions successfully as staff', async () => {
      const res = await request(app)
        .post('/api/v1/staff/quizzes')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          title: 'Quiz 938 Battle',
          description: 'Test your knowledge on Bach Dang 938 victory',
          contextId,
          grade: 12,
          chapterNumber: 1,
          chapterTitle: 'Historical Wars',
          era: EventEra.Medieval,
          durationSeconds: 900,
          questions: [
            {
              content: 'Ai la nguoi chi huy tran Bach Dang 938?',
              options: ['Ngo Quyen', 'Dinh Bo Linh', 'Le Hoan', 'Tran Hung Dao'],
              correctAnswer: 0,
              orderIndex: 0,
              explanation: 'Ngo Quyen la nguoi lanh dao tran Bach Dang nam 938.',
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Quiz 938 Battle');
      expect(res.body.data.questions.length).toBe(1);
      expect(res.body.data.questions[0].content).toContain('Ai la nguoi chi huy');
    });

    it('gets a list of quizzes for staff', async () => {
      const staffUserDoc = await User.findOne({ email: staffUser.email });
      await Quiz.create({
        contextId,
        createdBy: staffUserDoc!._id,
        title: 'Quiz 1',
        era: EventEra.Medieval,
        grade: 12,
      });

      const res = await request(app)
        .get('/api/v1/staff/quizzes')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.content.length).toBe(1);
      expect(res.body.data.content[0].title).toBe('Quiz 1');
    });

    it('updates quiz metadata', async () => {
      const staffUserDoc = await User.findOne({ email: staffUser.email });
      const quiz = await Quiz.create({
        contextId,
        createdBy: staffUserDoc!._id,
        title: 'Original Title',
        era: EventEra.Medieval,
        grade: 12,
      });

      const res = await request(app)
        .put(`/api/v1/staff/quizzes/${quiz._id}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          title: 'Updated Title',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Updated Title');
    });
  });

  describe('Customer Quiz Taking Flow', () => {
    let quizId: string;
    let questionId: string;

    beforeEach(async () => {
      // Setup a quiz and questions
      const staffUserDoc = await User.findOne({ email: staffUser.email });
      const quiz = await Quiz.create({
        contextId,
        createdBy: staffUserDoc!._id,
        title: 'Bach Dang Battle Quiz',
        description: 'Take this test',
        grade: 12,
        chapterNumber: 1,
        chapterTitle: 'Vietnamese History',
        era: EventEra.Medieval,
        durationSeconds: 900,
        isActive: true,
      });
      quizId = quiz._id.toString();

      const q = await Question.create({
        quizId: quiz._id,
        content: 'Ngo Quyen defeat which army?',
        options: ['Nam Han', 'Song', 'Mongol', 'Ming'],
        correctAnswer: 0,
        orderIndex: 0,
        explanation: 'Nam Han army.',
      });
      questionId = q._id.toString();
    });

    it('lists active quizzes for customers', async () => {
      const res = await request(app).get('/api/v1/quizzes');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].title).toBe('Bach Dang Battle Quiz');
    });

    it('starts and submits a quiz session successfully', async () => {
      // 1. Start session
      const startRes = await request(app)
        .post(`/api/v1/quizzes/${quizId}/start`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(startRes.status).toBe(200);
      expect(startRes.body.success).toBe(true);
      expect(startRes.body.data).toHaveProperty('sessionId');
      expect(startRes.body.data.questions.length).toBe(1);
      
      const sessionId = startRes.body.data.sessionId;

      // 2. Submit session
      const submitRes = await request(app)
        .post('/api/v1/quizzes/submit')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          sessionId,
          answers: [
            {
              questionId,
              selectedOption: 0, // Correct answer
            },
          ],
        });

      expect(submitRes.status).toBe(200);
      expect(submitRes.body.success).toBe(true);
      expect(submitRes.body.data.score).toBe(10);
      expect(submitRes.body.data.percentage).toBe(100);
      expect(submitRes.body.data.correctAnswers).toContain(0); // first question is correct
    });

    it('lists user quiz results', async () => {
      // Start and submit to have results
      const startRes = await request(app)
        .post(`/api/v1/quizzes/${quizId}/start`)
        .set('Authorization', `Bearer ${customerToken}`);
      const sessionId = startRes.body.data.sessionId;

      await request(app)
        .post('/api/v1/quizzes/submit')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          sessionId,
          answers: [{ questionId, selectedOption: 0 }],
        });

      const res = await request(app)
        .get('/api/v1/quizzes/results/me')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.content.length).toBe(1);
      expect(res.body.data.content[0].quizTitle).toBe('Bach Dang Battle Quiz');
      expect(res.body.data.content[0].score).toBe(10);
    });
  });
});
