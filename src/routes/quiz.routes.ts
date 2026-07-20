import { Router } from 'express';
import { QuizController } from '../controllers/quiz.controller';
import { authenticate, optionalAuth } from '../middlewares/auth.middleware';

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
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 0
 *       - in: query
 *         name: size
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Quiz results retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     content:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/QuizResultSummary'
 *                     totalElements:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     currentPage:
 *                       type: integer
 *                     pageSize:
 *                       type: integer
 *                     hasNext:
 *                       type: boolean
 *                     hasPrevious:
 *                       type: boolean
 */
router.get('/results/me', authenticate, QuizController.getMyResults);

/**
 * @openapi
 * /quizzes/results/me/{sessionId}:
 *   get:
 *     tags: [Quizzes]
 *     summary: Get one of the current user's completed quiz sessions
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Quiz result detail retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     sessionId:
 *                       type: string
 *                     quizId:
 *                       type: string
 *                     quizTitle:
 *                       type: string
 *                     score:
 *                       type: number
 *                     totalQuestions:
 *                       type: integer
 *                     percentage:
 *                       type: integer
 *                     limitedTime:
 *                       type: integer
 *                     startedAt:
 *                       type: string
 *                       format: date-time
 *                     completedAt:
 *                       type: string
 *                       format: date-time
 *                     previousAttempt:
 *                       type: object
 *                       nullable: true
 *                       description: Lan lam gan nhat truoc do cua cung quiz nay (null neu day la lan dau)
 *                       properties:
 *                         score:
 *                           type: number
 *                         percentage:
 *                           type: integer
 *                         completedAt:
 *                           type: string
 *                           format: date-time
 *                     questions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/QuizQuestion'
 *       404:
 *         description: Completed quiz session not found
 */
router.get('/results/me/:sessionId', authenticate, QuizController.getMyResultDetail);

/**
 * @openapi
 * /quizzes/submit:
 *   post:
 *     tags: [Quizzes]
 *     summary: Submit quiz answers
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sessionId, answers]
 *             properties:
 *               sessionId:
 *                 type: string
 *               answers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [questionId, selectedAnswer]
 *                   properties:
 *                     questionId:
 *                       type: string
 *                     selectedAnswer:
 *                       type: integer
 *                       minimum: 0
 *                     selectedOption:
 *                       type: integer
 *                       minimum: 0
 *                       description: Backward-compatible alias for selectedAnswer
 *     responses:
 *       200:
 *         description: Quiz answers submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     resultId:
 *                       type: string
 *                     score:
 *                       type: number
 *                     totalQuestions:
 *                       type: integer
 *                     percentage:
 *                       type: integer
 *                     startTime:
 *                       type: string
 *                       format: date-time
 *                     endTime:
 *                       type: string
 *                       format: date-time
 *                     correctAnswers:
 *                       type: array
 *                       items:
 *                         type: integer
 *                     wrongAnswers:
 *                       type: array
 *                       items:
 *                         type: integer
 */
router.post('/submit', authenticate, QuizController.submitSession);

/**
 * @openapi
 * /quizzes:
 *   get:
 *     tags: [Quizzes]
 *     summary: List quizzes
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by quiz title
 *     responses:
 *       200:
 *         description: Quizzes retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/QuizSummary'
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
 *     responses:
 *       200:
 *         description: Quiz retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/QuizSummary'
 *       404:
 *         description: Quiz not found
 */
router.get('/:quizId', optionalAuth, QuizController.getQuizById);

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
 *       - in: query
 *         name: limitedTime
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Optional session time limit in seconds
 *     responses:
 *       200:
 *         description: Quiz session started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     sessionId:
 *                       type: string
 *                     quizId:
 *                       type: string
 *                     title:
 *                       type: string
 *                     limitedTime:
 *                       type: integer
 *                     durationSeconds:
 *                       type: integer
 *                     questions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/QuizQuestion'
 *       404:
 *         description: Quiz not found
 */
router.post('/:quizId/start', authenticate, QuizController.startSession);

export default router;
