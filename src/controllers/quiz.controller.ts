import { Request, Response, NextFunction } from 'express';
import { QuizService } from '../services/quiz.service';
import { sendSuccess } from '../utils/response';
import { AppError } from '../utils/app-error';

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
      const data = await QuizService.getQuizById(req.params.quizId as string, req.user?.id);
      sendSuccess(res, data, 'Quiz retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async startSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limitedTime = req.query.limitedTime === undefined
        ? undefined
        : Number(req.query.limitedTime);
      const data = await QuizService.startSession(req.user!.id, req.params.quizId as string, limitedTime);
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

  static async getMyResultDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await QuizService.getMyResultDetail(req.user!.id, req.params.sessionId as string);
      sendSuccess(res, data, 'Quiz result detail retrieved successfully');
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

  static async staffListSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.query.userId as string | undefined;
      const page = parseInt(req.query.page as string) || 0;
      const size = parseInt(req.query.size as string) || 10;
      const data = await QuizService.staffListSessions({ userId, page, size });
      sendSuccess(res, data, 'Quiz sessions retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async staffGetSessionDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await QuizService.staffGetSessionDetail(req.params.sessionId as string);
      sendSuccess(res, data, 'Quiz session detail retrieved successfully');
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
      sendSuccess(res, {}, 'Quiz permanently deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async staffSoftDeleteQuiz(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await QuizService.staffSoftDeleteQuiz(req.params.quizId as string);
      sendSuccess(res, {}, 'Quiz soft deleted successfully');
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
      sendSuccess(res, {}, 'Question updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async staffDeleteQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await QuizService.staffDeleteQuestion(req.params.quizId as string, req.params.questionId as string);
      sendSuccess(res, {}, 'Question deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /staff/quizzes/import  (multipart/form-data, field: "file")
   *
   * Bulk-import quizzes from a CSV file. Each distinct quiz `title` in the CSV
   * becomes one Quiz (draft). Rows sharing the same title become questions.
   * Invalid/duplicate quiz groups are skipped and reported in `errors[]`.
   *
   * Request  : multipart/form-data  → field "file" (.csv)
   * Response : { success, data: { totalQuizzesAttempted, successCount, skippedCount, errors[], imported[] }, message }
   *
   * Mirrors: Java StaffQuizController.importQuizzes
   */
  static async staffImportQuizzes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        throw new AppError('File CSV là bắt buộc (field name: "file")', 400);
      }

      const data = await QuizService.staffImportQuizzes(
        req.file.buffer,
        req.file.originalname,
        req.user!.id,
      );

      sendSuccess(res, data, 'Import file CSV thành công');
    } catch (error) {
      next(error);
    }
  }
}
