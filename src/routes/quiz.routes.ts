import { Router } from 'express';
import { QuizController } from '../controllers/quiz.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Static routes must come before /:quizId to avoid param collision

/**
 * @openapi
 * tags:
 *   name: Quizzes
 *   description: Quiz management and taking
 */

/**
 * @openapi
 * /quizzes/results/me:
 *   get:
 *     tags: [Quizzes]
 *     summary: Get my quiz results
 *     security:
 *       - BearerAuth: []
 */
router.get('/results/me', authenticate, QuizController.getMyResults);

/**
 * @openapi
 * /quizzes/submit:
 *   post:
 *     tags: [Quizzes]
 *     summary: Submit quiz answers
 *     security:
 *       - BearerAuth: []
 */
router.post('/submit', authenticate, QuizController.submitSession);

/**
 * @openapi
 * /quizzes:
 *   get:
 *     tags: [Quizzes]
 *     summary: List quizzes
 */
router.get('/', QuizController.listQuizzes);

/**
 * @openapi
 * /quizzes/{quizId}:
 *   get:
 *     tags: [Quizzes]
 *     summary: Get quiz by ID
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/:quizId', QuizController.getQuizById);

/**
 * @openapi
 * /quizzes/{quizId}/start:
 *   post:
 *     tags: [Quizzes]
 *     summary: Start a quiz session
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 */
router.post('/:quizId/start', authenticate, QuizController.startSession);

export default router;
