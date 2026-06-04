import { Request, Response, NextFunction } from 'express';
import { QuizService } from '../services/quiz.service';
import { sendSuccess } from '../utils/response';

export class QuizController {
  // --- Customer / Public Methods ---

  static async listQuizzes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const search = req.query.search as string;
      const data = await QuizService.listQuizzes(search);
      sendSuccess(res, data, 'Quizzes retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getQuizById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await QuizService.getQuizById(req.params.quizId as string);
      sendSuccess(res, data, 'Quiz retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async startSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await QuizService.startSession(req.user!.id, req.params.quizId as string);
      sendSuccess(res, data, 'Quiz session started successfully');
    } catch (error) {
      next(error);
    }
  }

  static async submitSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await QuizService.submitSession(req.user!.id, req.body);
      sendSuccess(res, data, 'Quiz answers submitted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getMyResults(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 0;
      const size = parseInt(req.query.size as string) || 10;
      const data = await QuizService.getMyResults(req.user!.id, page, size);
      sendSuccess(res, data, 'Quiz results retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // --- Staff / Admin Methods ---

  static async staffListQuizzes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const search = req.query.search as string;
      const grade = req.query.grade ? parseInt(req.query.grade as string) : undefined;
      const era = req.query.era as string;
      const page = parseInt(req.query.page as string) || 0;
      const size = parseInt(req.query.size as string) || 10;

      const data = await QuizService.staffListQuizzes({ search, grade, era, page, size });
      sendSuccess(res, data, 'Quizzes retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async staffGetQuizDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await QuizService.staffGetQuizDetail(req.params.quizId as string);
      sendSuccess(res, data, 'Quiz detail retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async staffCreateQuiz(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await QuizService.staffCreateQuiz(req.user!.id, req.body);
      sendSuccess(res, data, 'Quiz created successfully');
    } catch (error) {
      next(error);
    }
  }

  static async staffUpdateQuiz(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await QuizService.staffUpdateQuiz(req.params.quizId as string, req.body);
      sendSuccess(res, data, 'Quiz updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async staffDeleteQuiz(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await QuizService.staffDeleteQuiz(req.params.quizId as string);
      sendSuccess(res, null, 'Quiz permanently deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async staffSoftDeleteQuiz(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await QuizService.staffSoftDeleteQuiz(req.params.quizId as string);
      sendSuccess(res, data, 'Quiz soft deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async staffRestoreQuiz(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await QuizService.staffRestoreQuiz(req.params.quizId as string);
      sendSuccess(res, data, 'Quiz restored successfully');
    } catch (error) {
      next(error);
    }
  }

  static async staffAddQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await QuizService.staffAddQuestion(req.params.quizId as string, req.body);
      sendSuccess(res, data, 'Question added successfully');
    } catch (error) {
      next(error);
    }
  }

  static async staffUpdateQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await QuizService.staffUpdateQuestion(req.params.quizId as string, req.params.questionId as string, req.body);
      sendSuccess(res, null, 'Question updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async staffDeleteQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await QuizService.staffDeleteQuestion(req.params.quizId as string, req.params.questionId as string);
      sendSuccess(res, null, 'Question deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}
