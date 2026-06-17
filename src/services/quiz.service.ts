import mongoose from 'mongoose';
import Quiz from '../models/quiz.model';
import Question from '../models/question.model';
import QuizSession from '../models/quiz-session.model';
import AnswerDetail from '../models/answer-detail.model';
import HistoricalContext from '../models/historical-context.model';
import { AppError } from '../utils/app-error';

export class QuizService {
  // --- Customer / Public Methods ---

  static async listQuizzes(search?: string): Promise<any[]> {
    const filter: any = {
      isActive: true,
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

  static async getQuizById(quizId: string): Promise<any> {
    const quiz = await Quiz.findOne({
      _id: quizId,
      isActive: true,
      deletedAt: { $exists: false },
    }).populate('contextId', 'name');

    if (!quiz) {
      throw new AppError('Không tìm thấy quiz', 404);
    }

    return {
      quizId: quiz._id.toString(),
      title: quiz.title,
      description: quiz.description || '',
      grade: quiz.grade,
      chapterNumber: quiz.chapterNumber,
      chapterTitle: quiz.chapterTitle || '',
      era: quiz.era,
      durationSeconds: quiz.durationSeconds || 0,
      playCount: quiz.playCount || 0,
      rating: quiz.rating || 0,
      contextTitle: (quiz.contextId as any)?.name || '',
    };
  }

  static async startSession(userId: string, quizId: string): Promise<any> {
    const quiz = await Quiz.findOne({
      _id: quizId,
      isActive: true,
      deletedAt: { $exists: false },
    });

    if (!quiz) {
      throw new AppError('Không tìm thấy quiz', 404);
    }

    const session = await QuizSession.create({
      quizId: quiz._id,
      uid: new mongoose.Types.ObjectId(userId),
      limitedTime: quiz.durationSeconds || 900,
      startTime: new Date(),
    });

    const questions = await Question.find({ quizId: quiz._id }).sort({ orderIndex: 1 });

    // Update playCount
    await Quiz.findByIdAndUpdate(quizId, { $inc: { playCount: 1 } });

    return {
      sessionId: session._id.toString(),
      quizId: quiz._id.toString(),
      title: quiz.title,
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
    submitData: { sessionId: string; answers: { questionId: string; selectedOption: number }[]; durationSeconds?: number }
  ): Promise<any> {
    const { sessionId, answers } = submitData;

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

    const quizId = session.quizId;
    const questions = await Question.find({ quizId });
    const questionMap = new Map(questions.map(q => [q._id.toString(), q]));

    let correctCount = 0;
    const answerDetails = [];

    const correctIndices: number[] = [];
    const wrongIndices: number[] = [];

    for (let i = 0; i < answers.length; i++) {
      const ans = answers[i];
      const question = questionMap.get(ans.questionId);
      if (!question) continue;

      const isCorrect = question.correctAnswer === ans.selectedOption;
      if (isCorrect) {
        correctCount++;
        correctIndices.push(i); // index in user's submission array
      } else {
        wrongIndices.push(i);
      }

      answerDetails.push({
        questionId: question._id,
        sessionId: session._id,
        selectedOption: ans.selectedOption,
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

    session.endTime = new Date();
    session.score = score;
    await session.save();

    return {
      resultId: session._id.toString(),
      score,
      totalQuestions: questions.length,
      percentage,
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

    const content = await Promise.all(
      sessions.map(async s => {
        const quiz: any = s.quizId;
        const duration = s.endTime ? Math.round((s.endTime.getTime() - s.startTime.getTime()) / 1000) : 0;
        const totalQuestions = quiz?._id ? await Question.countDocuments({ quizId: quiz._id }) : 0;
        const percentage = Math.round((s.score || 0) * 10); // score is out of 10
        return {
          resultId: s._id.toString(),
          quizId: quiz?._id?.toString() || '',
          quizTitle: quiz?.title || 'Unknown Quiz',
          score: s.score || 0,
          totalQuestions,
          percentage,
          durationSeconds: duration,
          completedAt: s.endTime?.toISOString() || s.updatedAt.toISOString(),
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
          description: q.description || '',
          grade: q.grade || 10,
          chapterNumber: q.chapterNumber || 1,
          chapterTitle: q.chapterTitle || '',
          era: q.era,
          durationSeconds: q.durationSeconds || 900,
          playCount: q.playCount || 0,
          rating: q.rating || 0,
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
      description: quiz.description || '',
      grade: quiz.grade || 10,
      chapterNumber: quiz.chapterNumber || 1,
      chapterTitle: quiz.chapterTitle || '',
      era: quiz.era,
      durationSeconds: quiz.durationSeconds || 900,
      playCount: quiz.playCount || 0,
      rating: quiz.rating || 0,
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

  static async staffCreateQuiz(userId: string, data: any): Promise<any> {
    const { title, description, contextId, grade, chapterNumber, chapterTitle, era, durationSeconds, questions } = data;

    // Check context exists
    const context = await HistoricalContext.findById(contextId);
    if (!context) {
      throw new AppError('Không tìm thấy bối cảnh lịch sử', 404);
    }

    const quiz = await Quiz.create({
      title,
      description,
      contextId: new mongoose.Types.ObjectId(contextId),
      createdBy: new mongoose.Types.ObjectId(userId),
      grade,
      chapterNumber,
      chapterTitle,
      era,
      durationSeconds,
      isActive: true,
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

    const allowedFields = ['title', 'description', 'contextId', 'grade', 'chapterNumber', 'chapterTitle', 'era', 'durationSeconds'];
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        if (field === 'contextId') {
          quiz.contextId = new mongoose.Types.ObjectId(data.contextId);
        } else {
          (quiz as any)[field] = data[field];
        }
      }
    }

    await quiz.save();
    return this.staffGetQuizDetail(quizId);
  }

  static async staffDeleteQuiz(quizId: string): Promise<void> {
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      throw new AppError('Không tìm thấy quiz', 404);
    }

    await Promise.all([
      Quiz.deleteOne({ _id: quizId }),
      Question.deleteMany({ quizId }),
      QuizSession.deleteMany({ quizId }),
    ]);
  }

  static async staffSoftDeleteQuiz(quizId: string): Promise<any> {
    const quiz = await Quiz.findByIdAndUpdate(
      quizId,
      { deletedAt: new Date(), isActive: false },
      { returnDocument: 'after' }
    );
    if (!quiz) {
      throw new AppError('Không tìm thấy quiz', 404);
    }
    return this.staffGetQuizDetail(quizId);
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
