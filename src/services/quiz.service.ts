import mongoose from 'mongoose';
import Quiz from '../models/quiz.model';
import Question from '../models/question.model';
import QuizSession from '../models/quiz-session.model';
import AnswerDetail from '../models/answer-detail.model';
import HistoricalContext from '../models/historical-context.model';
import QuizRating from '../models/quiz-rating.model';
import QuestionReport from '../models/question-report.model';
import { AppError } from '../utils/app-error';
import { QuizLevel, QuizStatus } from '../types/enums';
import { GamificationService } from './gamification.service';

export class QuizService {
  private static getQuizStatus(quiz: { deletedAt?: Date; isPublished?: boolean }): QuizStatus {
    if (quiz.deletedAt) return QuizStatus.Deleted;
    return quiz.isPublished === false ? QuizStatus.Draft : QuizStatus.Active;
  }

  // --- Customer / Public Methods ---

  static async listQuizzes(search?: string): Promise<any[]> {
    const filter: any = {
      isActive: true,
      isPublished: { $ne: false },
      deletedAt: { $exists: false },
    };

    if (search) {
      filter.title = { $regex: search, $options: 'i' };
    }

    const quizzes = await Quiz.find(filter).populate('contextId', 'name');
    
    return quizzes.map(q => {
      const contextTitle = (q.contextId as any)?.name || '';
      const contextId = (q.contextId as any)?._id?.toString() || q.contextId?.toString() || '';
      return {
        quizId: q._id.toString(),
        title: q.title,
        level: q.level || QuizLevel.Medium,
        description: q.description || '',
        grade: q.grade,
        chapterNumber: q.chapterNumber,
        chapterTitle: q.chapterTitle || '',
        era: q.era,
        durationSeconds: q.durationSeconds || 0,
        playCount: q.playCount || 0,
        rating: q.rating || 0,
        ratingCount: q.ratingCount || 0,
        contextId,
        contextTitle,
      };
    });
  }

  static async getQuizById(quizId: string, userId?: string): Promise<any> {
    const quiz = await Quiz.findOne({
      _id: quizId,
      isActive: true,
      isPublished: { $ne: false },
      deletedAt: { $exists: false },
    }).populate('contextId', 'name');

    if (!quiz) {
      throw new AppError('Không tìm thấy quiz', 404);
    }

    const [userPlayCount, myRating] = await Promise.all([
      userId
        ? QuizSession.countDocuments({
            quizId: quiz._id,
            uid: userId,
            endTime: { $exists: true },
          })
        : 0,
      userId ? QuizService.getMyRating(userId, quiz._id.toString()) : null,
    ]);

    return {
      quizId: quiz._id.toString(),
      title: quiz.title,
      level: quiz.level || QuizLevel.Medium,
      description: quiz.description || '',
      grade: quiz.grade,
      chapterNumber: quiz.chapterNumber,
      chapterTitle: quiz.chapterTitle || '',
      era: quiz.era,
      durationSeconds: quiz.durationSeconds || 0,
      playCount: quiz.playCount || 0,
      userPlayCount,
      rating: quiz.rating || 0,
      ratingCount: quiz.ratingCount || 0,
      myRating,
      contextId: (quiz.contextId as any)?._id?.toString() || quiz.contextId?.toString() || '',
      contextTitle: (quiz.contextId as any)?.name || '',
    };
  }

  static async startSession(userId: string, quizId: string, limitedTime?: number): Promise<any> {
    if (limitedTime !== undefined && (!Number.isInteger(limitedTime) || limitedTime <= 0)) {
      throw new AppError('limitedTime must be a positive integer', 400);
    }

    const quiz = await Quiz.findOne({
      _id: quizId,
      isActive: true,
      deletedAt: { $exists: false },
    });

    if (!quiz) {
      throw new AppError('Không tìm thấy quiz', 404);
    }

    const questions = await Question.find({ quizId: quiz._id }).sort({ orderIndex: 1 });
    const sessionLimitedTime = limitedTime ?? quiz.durationSeconds ?? 900;

    const session = await QuizSession.create({
      quizId: quiz._id,
      uid: new mongoose.Types.ObjectId(userId),
      limitedTime: sessionLimitedTime > 0 ? sessionLimitedTime : 900,
      startTime: new Date(),
      totalQuestions: questions.length,
    });

    return {
      sessionId: session._id.toString(),
      quizId: quiz._id.toString(),
      title: quiz.title,
      limitedTime: session.limitedTime,
      durationSeconds: session.limitedTime,
      questions: questions.map(q => ({
        questionId: q._id.toString(),
        content: q.content,
        options: q.options,
        correctAnswer: q.correctAnswer,
        orderIndex: q.orderIndex,
        explanation: q.explanation || '',
      })),
    };
  }

  static async submitSession(
    userId: string,
    submitData: {
      sessionId: string;
      answers: { questionId: string; selectedAnswer?: number; selectedOption?: number }[];
    }
  ): Promise<any> {
    const { sessionId, answers } = submitData;
    if (!sessionId || !Array.isArray(answers)) {
      throw new AppError('sessionId and answers are required', 400);
    }

    const session = await QuizSession.findOne({
      _id: sessionId,
      uid: userId,
    });

    if (!session) {
      throw new AppError('Không tìm thấy phiên làm bài', 404);
    }

    if (session.endTime) {
      throw new AppError('Phiên làm bài đã được nộp', 400);
    }

    const deadline = new Date(session.startTime.getTime() + session.limitedTime * 1000);
    const endTime = new Date() > deadline ? deadline : new Date();

    const quizId = session.quizId;
    const questions = await Question.find({ quizId }).sort({ orderIndex: 1 });
    const questionMap = new Map(questions.map(q => [q._id.toString(), q]));
    const submittedAnswers = new Map<string, number>();

    for (const answer of answers) {
      const question = questionMap.get(answer.questionId);
      if (!question) {
        throw new AppError('Answer contains a question that does not belong to this quiz', 400);
      }
      if (submittedAnswers.has(answer.questionId)) {
        throw new AppError('Duplicate answers are not allowed', 400);
      }

      const rawAnswer = answer.selectedAnswer !== undefined ? answer.selectedAnswer : answer.selectedOption;
      // null/undefined means the user explicitly left this question unanswered
      if (rawAnswer === null || rawAnswer === undefined) {
        continue;
      }
      if (
        !Number.isInteger(rawAnswer)
        || rawAnswer < 0
        || rawAnswer >= question.options.length
      ) {
        throw new AppError('selectedAnswer is invalid', 400);
      }
      submittedAnswers.set(answer.questionId, rawAnswer);
    }

    let correctCount = 0;
    const answerDetails: {
      questionId: mongoose.Types.ObjectId;
      sessionId: mongoose.Types.ObjectId;
      selectedOption: number;
      isCorrect: boolean;
    }[] = [];

    const correctIndices: number[] = [];
    const wrongIndices: number[] = [];

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const selectedAnswer = submittedAnswers.get(question._id.toString());
      if (selectedAnswer === undefined) {
        wrongIndices.push(i);
        continue;
      }

      const isCorrect = question.correctAnswer === selectedAnswer;
      if (isCorrect) {
        correctCount++;
        correctIndices.push(i);
      } else {
        wrongIndices.push(i);
      }

      answerDetails.push({
        questionId: question._id,
        sessionId: session._id,
        selectedOption: selectedAnswer,
        isCorrect,
      });
    }

    // Save answer details
    if (answerDetails.length > 0) {
      await AnswerDetail.insertMany(answerDetails);
    }

    // Calculate score (out of 10)
    const score = questions.length > 0 ? parseFloat(((correctCount / questions.length) * 10).toFixed(2)) : 0;
    const percentage = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

    session.endTime = endTime;
    session.score = score;
    session.totalQuestions = questions.length;
    session.percentage = percentage;
    await Promise.all([
      session.save(),
      Quiz.findByIdAndUpdate(quizId, { $inc: { playCount: 1 } }),
    ]);

    // Gamification: tính quest "làm quiz" (best-effort, không chặn response)
    setImmediate(() => void GamificationService.recordProgress(userId, 'QUIZ'));

    return {
      resultId: session._id.toString(),
      score,
      totalQuestions: questions.length,
      percentage,
      startTime: session.startTime.toISOString(),
      endTime: endTime.toISOString(),
      correctAnswers: correctIndices,
      wrongAnswers: wrongIndices,
    };
  }

  static async getMyResults(userId: string, page = 0, size = 10): Promise<any> {
    const skip = page * size;
    const sessions = await QuizSession.find({ uid: userId, endTime: { $exists: true } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(size)
      .populate({
        path: 'quizId',
        select: 'title',
      });

    const total = await QuizSession.countDocuments({ uid: userId, endTime: { $exists: true } });

    const quizIds = sessions
      .map(s => (s.quizId as any)?._id)
      .filter(Boolean);
    const questionCounts = await Question.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
      { $match: { quizId: { $in: quizIds } } },
      { $group: { _id: '$quizId', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(questionCounts.map(item => [item._id.toString(), item.count]));

    const content = sessions.map(s => {
      const quiz: any = s.quizId;
      const totalQuestions = s.totalQuestions ?? countMap.get(quiz?._id?.toString()) ?? 0;
      const score = s.score ?? 0;
      const percentage = s.percentage ?? (totalQuestions > 0 ? Math.round((score / 10) * 100) : 0);
      return {
        sessionId: s._id.toString(),
        quizId: quiz?._id?.toString() || '',
        quizTitle: quiz?.title || 'Unknown Quiz',
        score,
        totalQuestions,
        percentage,
        completedAt: s.endTime?.toISOString() || s.updatedAt.toISOString(),
      };
    });

    return {
      content,
      totalElements: total,
      totalPages: Math.ceil(total / size),
      currentPage: page,
      pageSize: size,
      hasNext: skip + size < total,
      hasPrevious: page > 0,
    };
  }

  static async getMyResultDetail(userId: string, sessionId: string): Promise<any> {
    const session = await QuizSession.findOne({
      _id: sessionId,
      uid: userId,
      endTime: { $exists: true },
    }).populate({
      path: 'quizId',
      select: 'title contextId',
    });

    if (!session) {
      throw new AppError('Completed quiz session not found', 404);
    }

    const quiz: any = session.quizId;
    const questions = await Question.find({ quizId: quiz?._id }).sort({ orderIndex: 1 });
    const answers = await AnswerDetail.find({ sessionId: session._id });
    const answerMap = new Map(answers.map(answer => [answer.questionId.toString(), answer]));
    const totalQuestions = session.totalQuestions ?? questions.length;
    const score = session.score ?? 0;
    const percentage = session.percentage ?? (totalQuestions > 0 ? Math.round((score / 10) * 100) : 0);

    // Lan lam gan nhat truoc do cua CUNG quiz nay (de FE hien "so voi lan truoc").
    const previousSession = quiz?._id
      ? await QuizSession.findOne({
          quizId: quiz._id,
          uid: userId,
          endTime: { $exists: true },
          _id: { $ne: session._id },
        }).sort({ endTime: -1 })
      : null;
    const previousAttempt = previousSession
      ? {
          score: previousSession.score ?? 0,
          percentage:
            previousSession.percentage ??
            (previousSession.totalQuestions
              ? Math.round(((previousSession.score ?? 0) / 10) * 100)
              : 0),
          completedAt: previousSession.endTime!.toISOString(),
        }
      : null;

    return {
      sessionId: session._id.toString(),
      quizId: quiz?._id?.toString() || '',
      quizTitle: quiz?.title || 'Unknown Quiz',
      contextId: quiz?.contextId?.toString() || '',
      score,
      totalQuestions,
      percentage,
      limitedTime: session.limitedTime,
      startedAt: session.startTime.toISOString(),
      completedAt: session.endTime!.toISOString(),
      previousAttempt,
      questions: questions.map(question => {
        const answer = answerMap.get(question._id.toString());
        return {
          questionId: question._id.toString(),
          content: question.content,
          options: question.options,
          correctAnswer: question.correctAnswer,
          selectedAnswer: answer?.selectedOption ?? null,
          explanation: question.explanation || '',
          correct: answer?.isCorrect ?? false,
        };
      }),
    };
  }

  /** Danh gia 1 quiz (1-5 sao). Moi user chi co 1 danh gia — danh gia lai se ghi de. */
  static async rateQuiz(userId: string, quizId: string, value: number): Promise<{
    rating: number;
    ratingCount: number;
    myRating: number;
  }> {
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      throw new AppError('value phai la so nguyen tu 1 den 5', 400);
    }

    const quiz = await Quiz.findOne({ _id: quizId, deletedAt: { $exists: false } });
    if (!quiz) {
      throw new AppError('Không tìm thấy quiz', 404);
    }

    await QuizRating.findOneAndUpdate(
      { quizId: quiz._id, uid: userId },
      { $set: { value } },
      { upsert: true },
    );

    const stats = await QuizRating.aggregate<{ _id: null; avg: number; count: number }>([
      { $match: { quizId: quiz._id } },
      { $group: { _id: null, avg: { $avg: '$value' }, count: { $sum: 1 } } },
    ]);

    const avg = stats[0]?.avg ?? value;
    const count = stats[0]?.count ?? 1;
    const rounded = Math.round(avg * 10) / 10;

    quiz.rating = rounded;
    quiz.ratingCount = count;
    await quiz.save();

    return { rating: rounded, ratingCount: count, myRating: value };
  }

  /** Danh gia hien tai cua user nay cho 1 quiz (null neu chua danh gia). */
  static async getMyRating(userId: string, quizId: string): Promise<number | null> {
    const existing = await QuizRating.findOne({ quizId, uid: userId }).select('value');
    return existing?.value ?? null;
  }

  /** Nguoi dung bao 1 cau hoi co van de (sai dap an, dich loi...) de staff xem lai. */
  static async reportQuestion(userId: string, questionId: string, reason?: string): Promise<void> {
    const question = await Question.findById(questionId).select('quizId');
    if (!question) {
      throw new AppError('Không tìm thấy câu hỏi', 404);
    }

    await QuestionReport.create({
      questionId: question._id,
      quizId: question.quizId,
      uid: userId,
      reason: reason?.trim() || undefined,
    });
  }

  // --- Staff / Admin Methods ---

  static async staffListQuizzes(query: { search?: string; grade?: number; era?: string; page?: number; size?: number }): Promise<any> {
    const { search, grade, era, page = 0, size = 10 } = query;
    const skip = page * size;

    const filter: any = {};
    if (search) {
      filter.title = { $regex: search, $options: 'i' };
    }
    if (grade) {
      filter.grade = grade;
    }
    if (era) {
      filter.era = era;
    }

    const quizzes = await Quiz.find(filter)
      .populate('contextId', 'name')
      .populate('createdBy', 'userName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(size);

    const total = await Quiz.countDocuments(filter);

    const content = await Promise.all(
      quizzes.map(async q => {
        const questions = await Question.find({ quizId: q._id }).sort({ orderIndex: 1 });
        return {
          quizId: q._id.toString(),
          title: q.title,
          level: q.level || QuizLevel.Medium,
          description: q.description || '',
          grade: q.grade || 10,
          chapterNumber: q.chapterNumber || 1,
          chapterTitle: q.chapterTitle || '',
          era: q.era,
          durationSeconds: q.durationSeconds || 900,
          playCount: q.playCount || 0,
          rating: q.rating || 0,
          isPublished: q.isPublished ?? true,
          status: this.getQuizStatus(q),
          contextId: (q.contextId as any)?._id?.toString() || q.contextId?.toString() || '',
          contextTitle: (q.contextId as any)?.name || '',
          createdBy: (q.createdBy as any)?.userName || q.createdBy?.toString() || '',
          createdDate: q.createdAt.toISOString(),
          updatedDate: q.updatedAt.toISOString(),
          deletedAt: q.deletedAt ? q.deletedAt.toISOString() : null,
          questions: questions.map(qu => ({
            questionId: qu._id.toString(),
            content: qu.content,
            options: qu.options,
            correctAnswer: qu.correctAnswer,
            orderIndex: qu.orderIndex,
            explanation: qu.explanation || '',
          })),
        };
      })
    );

    return {
      content,
      totalElements: total,
      totalPages: Math.ceil(total / size),
      currentPage: page,
      pageSize: size,
      hasNext: skip + size < total,
      hasPrevious: page > 0,
    };
  }

  static async staffGetQuizDetail(quizId: string): Promise<any> {
    const quiz = await Quiz.findById(quizId)
      .populate('contextId', 'name')
      .populate('createdBy', 'userName');

    if (!quiz) {
      throw new AppError('Không tìm thấy quiz', 404);
    }

    const questions = await Question.find({ quizId: quiz._id }).sort({ orderIndex: 1 });

    return {
      quizId: quiz._id.toString(),
      title: quiz.title,
      level: quiz.level || QuizLevel.Medium,
      description: quiz.description || '',
      grade: quiz.grade || 10,
      chapterNumber: quiz.chapterNumber || 1,
      chapterTitle: quiz.chapterTitle || '',
      era: quiz.era,
      durationSeconds: quiz.durationSeconds || 900,
      playCount: quiz.playCount || 0,
      rating: quiz.rating || 0,
      isPublished: quiz.isPublished ?? true,
      status: this.getQuizStatus(quiz),
      contextId: (quiz.contextId as any)?._id?.toString() || quiz.contextId?.toString() || '',
      contextTitle: (quiz.contextId as any)?.name || '',
      createdBy: (quiz.createdBy as any)?.userName || quiz.createdBy?.toString() || '',
      createdDate: quiz.createdAt.toISOString(),
      updatedDate: quiz.updatedAt.toISOString(),
      deletedAt: quiz.deletedAt ? quiz.deletedAt.toISOString() : null,
      questions: questions.map(qu => ({
        questionId: qu._id.toString(),
        content: qu.content,
        options: qu.options,
        correctAnswer: qu.correctAnswer,
        orderIndex: qu.orderIndex,
        explanation: qu.explanation || '',
      })),
    };
  }

  static async staffListSessions(query: { userId?: string; page?: number; size?: number }): Promise<any> {
    const { userId, page = 0, size = 10 } = query;
    const skip = page * size;
    const filter: Record<string, unknown> = { endTime: { $exists: true } };
    if (userId) {
      filter.uid = userId;
    }

    const sessions = await QuizSession.find(filter)
      .sort({ endTime: -1 })
      .skip(skip)
      .limit(size)
      .populate({
        path: 'quizId',
        select: 'title',
      });
    const total = await QuizSession.countDocuments(filter);
    const quizIds = sessions
      .map(session => (session.quizId as any)?._id)
      .filter(Boolean);
    const questionCounts = await Question.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
      { $match: { quizId: { $in: quizIds } } },
      { $group: { _id: '$quizId', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(questionCounts.map(item => [item._id.toString(), item.count]));

    return {
      content: sessions.map(session => {
        const quiz: any = session.quizId;
        const totalQuestions = session.totalQuestions ?? countMap.get(quiz?._id?.toString()) ?? 0;
        const score = session.score ?? 0;
        return {
          sessionId: session._id.toString(),
          quizId: quiz?._id?.toString() || '',
          quizTitle: quiz?.title || 'Unknown Quiz',
          score,
          totalQuestions,
          percentage: session.percentage ?? (totalQuestions > 0 ? Math.round((score / 10) * 100) : 0),
          completedAt: session.endTime?.toISOString() || session.updatedAt.toISOString(),
        };
      }),
      totalElements: total,
      totalPages: Math.ceil(total / size),
      currentPage: page,
      pageSize: size,
      hasNext: skip + size < total,
      hasPrevious: page > 0,
    };
  }

  static async staffGetSessionDetail(sessionId: string): Promise<any> {
    const session = await QuizSession.findOne({
      _id: sessionId,
      endTime: { $exists: true },
    }).populate({
      path: 'quizId',
      select: 'title',
    });

    if (!session) {
      throw new AppError('Completed quiz session not found', 404);
    }

    const quiz: any = session.quizId;
    const questions = await Question.find({ quizId: quiz?._id }).sort({ orderIndex: 1 });
    const answers = await AnswerDetail.find({ sessionId: session._id });
    const answerMap = new Map(answers.map(answer => [answer.questionId.toString(), answer]));
    const totalQuestions = session.totalQuestions ?? questions.length;
    const score = session.score ?? 0;

    return {
      sessionId: session._id.toString(),
      quizId: quiz?._id?.toString() || '',
      quizTitle: quiz?.title || 'Unknown Quiz',
      score,
      totalQuestions,
      percentage: session.percentage ?? (totalQuestions > 0 ? Math.round((score / 10) * 100) : 0),
      limitedTime: session.limitedTime,
      startedAt: session.startTime.toISOString(),
      completedAt: session.endTime!.toISOString(),
      questions: questions.map(question => {
        const answer = answerMap.get(question._id.toString());
        return {
          questionId: question._id.toString(),
          content: question.content,
          options: question.options,
          correctAnswer: question.correctAnswer,
          selectedAnswer: answer?.selectedOption ?? null,
          explanation: question.explanation || '',
          correct: answer?.isCorrect ?? false,
        };
      }),
    };
  }

  static async staffCreateQuiz(userId: string, data: any): Promise<any> {
    const {
      title,
      description,
      contextId,
      level,
      grade,
      chapterNumber,
      chapterTitle,
      durationSeconds,
      questions,
      isPublished,
    } = data;
    if (level !== undefined && !Object.values(QuizLevel).includes(level)) {
      throw new AppError('level must be EASY, MEDIUM, or HARD', 400);
    }

    // Check context exists
    const context = await HistoricalContext.findById(contextId);
    if (!context) {
      throw new AppError('Không tìm thấy bối cảnh lịch sử', 404);
    }

    const quiz = await Quiz.create({
      title,
      description,
      contextId: context._id,
      createdBy: new mongoose.Types.ObjectId(userId),
      level: level || QuizLevel.Medium,
      grade,
      chapterNumber,
      chapterTitle,
      era: context.era,
      durationSeconds,
      isActive: true,
      isPublished: isPublished ?? true,
    });

    const questionDocs = [];
    if (questions && Array.isArray(questions)) {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        questionDocs.push({
          quizId: quiz._id,
          content: q.content,
          options: q.options,
          correctAnswer: q.correctAnswer,
          orderIndex: q.orderIndex ?? i,
          explanation: q.explanation,
        });
      }
      if (questionDocs.length > 0) {
        await Question.insertMany(questionDocs);
      }
    }

    return this.staffGetQuizDetail(quiz._id.toString());
  }

  static async staffUpdateQuiz(quizId: string, data: any): Promise<any> {
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      throw new AppError('Không tìm thấy quiz', 404);
    }
    if (data.level !== undefined && !Object.values(QuizLevel).includes(data.level)) {
      throw new AppError('level must be EASY, MEDIUM, or HARD', 400);
    }

    const allowedFields = [
      'title',
      'description',
      'level',
      'grade',
      'chapterNumber',
      'chapterTitle',
      'durationSeconds',
      'isPublished',
    ];
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        (quiz as any)[field] = data[field];
      }
    }

    if (data.contextId !== undefined) {
      const context = await HistoricalContext.findById(data.contextId);
      if (!context) {
        throw new AppError('Historical context not found', 404);
      }
      quiz.contextId = context._id;
      quiz.era = context.era;
    }

    await quiz.save();
    return this.staffGetQuizDetail(quizId);
  }

  static async staffDeleteQuiz(quizId: string): Promise<void> {
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      throw new AppError('Không tìm thấy quiz', 404);
    }

    const sessions = await QuizSession.find({ quizId }).select('_id');
    const sessionIds = sessions.map(session => session._id);
    await Promise.all([
      Quiz.deleteOne({ _id: quizId }),
      Question.deleteMany({ quizId }),
      QuizSession.deleteMany({ quizId }),
      AnswerDetail.deleteMany({ sessionId: { $in: sessionIds } }),
    ]);
  }

  static async staffSoftDeleteQuiz(quizId: string): Promise<void> {
    const quiz = await Quiz.findByIdAndUpdate(
      quizId,
      { deletedAt: new Date(), isActive: false },
      { returnDocument: 'after' }
    );
    if (!quiz) {
      throw new AppError('Không tìm thấy quiz', 404);
    }
  }

  static async staffRestoreQuiz(quizId: string): Promise<any> {
    const quiz = await Quiz.findByIdAndUpdate(
      quizId,
      { $unset: { deletedAt: 1 }, isActive: true },
      { returnDocument: 'after' }
    );
    if (!quiz) {
      throw new AppError('Không tìm thấy quiz', 404);
    }
    return this.staffGetQuizDetail(quizId);
  }

  static async staffAddQuestion(quizId: string, questionData: any): Promise<any> {
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      throw new AppError('Không tìm thấy quiz', 404);
    }

    const question = await Question.create({
      quizId: quiz._id,
      content: questionData.content,
      options: questionData.options,
      correctAnswer: questionData.correctAnswer,
      orderIndex: questionData.orderIndex || 0,
      explanation: questionData.explanation,
    });

    return {
      questionId: question._id.toString(),
      content: question.content,
      options: question.options,
      correctAnswer: question.correctAnswer,
      orderIndex: question.orderIndex,
      explanation: question.explanation || '',
    };
  }

  static async staffUpdateQuestion(quizId: string, questionId: string, questionData: any): Promise<void> {
    const question = await Question.findOne({ _id: questionId, quizId });
    if (!question) {
      throw new AppError('Câu hỏi không thuộc về quiz này', 404);
    }

    const allowedFields = ['content', 'options', 'correctAnswer', 'orderIndex', 'explanation'];
    for (const field of allowedFields) {
      if (questionData[field] !== undefined) {
        (question as any)[field] = questionData[field];
      }
    }

    await question.save();
  }

  static async staffDeleteQuestion(quizId: string, questionId: string): Promise<void> {
    const result = await Question.deleteOne({ _id: questionId, quizId });
    if (result.deletedCount === 0) {
      throw new AppError('Câu hỏi không thuộc về quiz này', 404);
    }
  }

  // ==================== CSV Import ====================

  /**
   * Bulk-import quizzes from a CSV file uploaded as a Buffer (multer memoryStorage).
   *
   * CSV format (header row required):
   *   title,contextId,level,questionContent,option1,option2,option3,option4,correctAnswer,explanation
   *
   * Rows sharing the same `title` are grouped into one quiz.
   * Each group becomes one Quiz (isPublished = false) with N Questions.
   * Duplicate titles, invalid contextIds, or validation errors → row skipped with error message.
   *
   * Mirrors Java: QuizServiceImpl.importQuizzesFromCsv + saveQuizGroup
   *
   * @returns QuizImportResponse: { totalQuizzesAttempted, successCount, skippedCount, errors, imported }
   */
  static async staffImportQuizzes(
    fileBuffer: Buffer,
    originalName: string,
    userId: string,
  ): Promise<{
    totalQuizzesAttempted: number;
    successCount: number;
    skippedCount: number;
    errors: string[];
    imported: any[];
  }> {
    // ── 1. Basic file validation ─────────────────────────────────────────────
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new AppError('File CSV không được để trống', 400);
    }
    if (!originalName.toLowerCase().endsWith('.csv')) {
      throw new AppError('Chỉ chấp nhận file .csv', 400);
    }

    // ── 2. Parse CSV from buffer ─────────────────────────────────────────────
    const { parse } = await import('csv-parse');

    const REQUIRED_HEADERS = [
      'title', 'contextId', 'level',
      'questionContent', 'option1', 'option2', 'option3', 'option4',
      'correctAnswer', 'explanation',
    ];

    const records: Record<string, string>[] = await new Promise((resolve, reject) => {
      parse(
        fileBuffer,
        {
          columns: true,         // first row = header
          skip_empty_lines: true,
          trim: true,
          bom: true,             // handle UTF-8 BOM
        },
        (err, rows: Record<string, string>[]) => {
          if (err) return reject(new AppError('Không thể đọc file CSV: ' + err.message, 400));
          resolve(rows);
        },
      );
    });

    // Validate headers
    if (records.length === 0) {
      throw new AppError('File CSV không chứa hàng dữ liệu hợp lệ nào', 400);
    }
    const headers = Object.keys(records[0]);
    for (const h of REQUIRED_HEADERS) {
      if (!headers.includes(h)) {
        throw new AppError(`File CSV thiếu cột tiêu đề bắt buộc: '${h}'`, 400);
      }
    }

    // ── 3. Group rows by title (preserve insertion order) ────────────────────
    const grouped = new Map<string, Record<string, string>[]>();
    for (const row of records) {
      const title = (row['title'] || '').trim();
      if (!title) continue; // skip blank-title rows
      if (!grouped.has(title)) grouped.set(title, []);
      grouped.get(title)!.push(row);
    }

    if (grouped.size === 0) {
      throw new AppError('File CSV không chứa hàng dữ liệu hợp lệ nào', 400);
    }

    // ── 4. Process each quiz group ───────────────────────────────────────────
    const totalQuizzesAttempted = grouped.size;
    let successCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];
    const imported: any[] = [];

    for (const [title, rows] of grouped.entries()) {
      try {
        const created = await this._saveQuizGroup(title, rows, userId);
        imported.push(created);
        successCount++;
      } catch (err: any) {
        const msg = err?.message ?? 'Unexpected error';
        if (msg.includes('đã tồn tại') || msg.includes('duplicate') || msg.toLowerCase().includes('conflict')) {
          errors.push(`Quiz '${title}' skipped — duplicate title: ${msg}`);
        } else if (err?.statusCode === 404) {
          errors.push(`Quiz '${title}' skipped — ${msg}`);
        } else {
          errors.push(`Quiz '${title}' skipped — validation error: ${msg}`);
        }
        skippedCount++;
      }
    }

    return { totalQuizzesAttempted, successCount, skippedCount, errors, imported };
  }

  /**
   * Validates and persists one quiz group (one quiz + its questions).
   * Mirrors Java: QuizServiceImpl.saveQuizGroup
   */
  private static async _saveQuizGroup(
    title: string,
    rows: Record<string, string>[],
    userId: string,
  ): Promise<any> {
    const first = rows[0];

    // Validate contextId
    const contextIdStr = (first['contextId'] || '').trim();
    if (!contextIdStr) throw new AppError('contextId không được để trống', 400);

    const mongoose = (await import('mongoose')).default;
    if (!mongoose.Types.ObjectId.isValid(contextIdStr)) {
      throw new AppError(`HistoricalContext not found for contextId: ${contextIdStr}`, 404);
    }

    const context = await HistoricalContext.findById(contextIdStr);
    if (!context) {
      throw new AppError(`HistoricalContext not found for contextId: ${contextIdStr}`, 404);
    }

    // Validate level
    const levelStr = (first['level'] || '').trim().toUpperCase();
    if (!Object.values(QuizLevel).includes(levelStr as QuizLevel)) {
      throw new AppError(
        `Giá trị cấp độ (level) không hợp lệ: ${levelStr}. Giá trị hợp lệ: EASY, MEDIUM, HARD`,
        400,
      );
    }

    // Duplicate title check
    const exists = await Quiz.findOne({ title: { $regex: `^${title}$`, $options: 'i' } });
    if (exists) throw new AppError(`Quiz với tiêu đề '${title}' đã tồn tại`, 409);

    // Create Quiz (draft — isPublished = false, mirrors Java)
    const quiz = await Quiz.create({
      title,
      contextId: context._id,
      createdBy: new mongoose.Types.ObjectId(userId),
      level: levelStr as QuizLevel,
      era: context.era,
      isActive: true,
      isPublished: false,   // always draft on import, same as Java
    }) as import('../models/quiz.model').IQuiz;

    // Create Questions
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      const questionContent = (row['questionContent'] || '').trim();
      if (!questionContent) {
        throw new AppError(`Hàng ${rowNum}: questionContent must not be empty`, 400);
      }

      const options = [
        (row['option1'] || '').trim(),
        (row['option2'] || '').trim(),
        (row['option3'] || '').trim(),
        (row['option4'] || '').trim(),
      ];
      for (let o = 0; o < options.length; o++) {
        if (!options[o]) {
          throw new AppError(`Hàng ${rowNum}: option${o + 1} must not be empty`, 400);
        }
      }

      const correctAnswerRaw = (row['correctAnswer'] || '').trim();
      const correctAnswer = parseInt(correctAnswerRaw, 10);
      if (isNaN(correctAnswer)) {
        throw new AppError(`Hàng ${rowNum}: correctAnswer must be an integer (0-3)`, 400);
      }
      if (correctAnswer < 0 || correctAnswer > 3) {
        throw new AppError(
          `Hàng ${rowNum}: correctAnswer must be between 0 and 3, got: ${correctAnswer}`,
          400,
        );
      }

      const explanation = (row['explanation'] || '').trim() || undefined;

      await Question.create({
        quizId: quiz._id,
        content: questionContent,
        options,
        correctAnswer,
        orderIndex: i,
        explanation,
      });
    }

    // Return full quiz detail (same shape as staffGetQuizDetail)
    return this.staffGetQuizDetail(quiz._id.toString());
  }

  /** Staff: liet ke report cau hoi (moi nhat truoc), kem ngu canh quiz/cau hoi/nguoi bao. */
  static async staffListQuestionReports(query: {
    status?: 'OPEN' | 'RESOLVED';
    page?: number;
    size?: number;
  }): Promise<any> {
    const { status, page = 0, size = 20 } = query;
    const skip = page * size;

    const filter: any = {};
    if (status) filter.status = status;

    const [reports, total] = await Promise.all([
      QuestionReport.find(filter)
        .populate('questionId', 'content')
        .populate('quizId', 'title')
        .populate('uid', 'userName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(size),
      QuestionReport.countDocuments(filter),
    ]);

    const content = reports.map((r: any) => ({
      reportId: r._id.toString(),
      questionId: r.questionId?._id?.toString() ?? '',
      questionContent: r.questionId?.content ?? '',
      quizId: r.quizId?._id?.toString() ?? '',
      quizTitle: r.quizId?.title ?? '',
      reportedBy: r.uid?.userName ?? '',
      reason: r.reason ?? '',
      status: r.status,
      createdAt: r.createdAt,
    }));

    return {
      content,
      totalElements: total,
      totalPages: Math.ceil(total / size) || 1,
      currentPage: page,
      pageSize: size,
      hasNext: skip + size < total,
      hasPrevious: page > 0,
    };
  }

  /** Staff: danh dau 1 report da duoc xu ly xong. */
  static async staffResolveQuestionReport(reportId: string): Promise<void> {
    const report = await QuestionReport.findById(reportId);
    if (!report) {
      throw new AppError('Không tìm thấy báo cáo', 404);
    }
    report.status = 'RESOLVED';
    await report.save();
  }
}
