import mongoose from 'mongoose';
import Quiz from '../models/quiz.model';
import Question from '../models/question.model';
import QuizSession from '../models/quiz-session.model';
import AnswerDetail from '../models/answer-detail.model';
import HistoricalContext from '../models/historical-context.model';
import { AppError } from '../utils/app-error';
import { QuizLevel, QuizStatus } from '../types/enums';

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

    const userPlayCount = userId
      ? await QuizSession.countDocuments({
          quizId: quiz._id,
          uid: userId,
          endTime: { $exists: true },
        })
      : 0;

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

    const endTime = new Date();
    if (endTime.getTime() > session.startTime.getTime() + session.limitedTime * 1000) {
      throw new AppError('Quiz session time limit expired', 400);
    }

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

      const selectedAnswer = answer.selectedAnswer ?? answer.selectedOption;
      if (
        !Number.isInteger(selectedAnswer)
        || selectedAnswer === undefined
        || selectedAnswer < 0
        || selectedAnswer >= question.options.length
      ) {
        throw new AppError('selectedAnswer is invalid', 400);
      }
      submittedAnswers.set(answer.questionId, selectedAnswer);
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
    await session.save();

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
    const percentage = session.percentage ?? (totalQuestions > 0 ? Math.round((score / 10) * 100) : 0);

    return {
      sessionId: session._id.toString(),
      quizId: quiz?._id?.toString() || '',
      quizTitle: quiz?.title || 'Unknown Quiz',
      score,
      totalQuestions,
      percentage,
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
}
