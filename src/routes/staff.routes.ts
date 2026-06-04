import { Router } from 'express';
import { QuizController } from '../controllers/quiz.controller';
import { authenticate, authorizeRoles } from '../middlewares/auth.middleware';
import { UserRole } from '../types/enums';

const router = Router();

// All routes here require CONTENT_ADMIN or SYSTEM_ADMIN role
router.use(authenticate, authorizeRoles(UserRole.ContentAdmin, UserRole.SystemAdmin));

/**
 * @openapi
 * tags:
 *   name: Staff Quizzes
 *   description: Staff quiz management
 */

/**
 * @openapi
 * /staff/quizzes:
 *   get:
 *     tags: [Staff Quizzes]
 *     summary: List quizzes for staff
 *     security:
 *       - BearerAuth: []
 */
router.get('/quizzes', QuizController.staffListQuizzes);

/**
 * @openapi
 * /staff/quizzes/{quizId}:
 *   get:
 *     tags: [Staff Quizzes]
 *     summary: Get quiz detail with all questions
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/quizzes/:quizId', QuizController.staffGetQuizDetail);

/**
 * @openapi
 * /staff/quizzes:
 *   post:
 *     tags: [Staff Quizzes]
 *     summary: Create a quiz
 *     security:
 *       - BearerAuth: []
 */
router.post('/quizzes', QuizController.staffCreateQuiz);

/**
 * @openapi
 * /staff/quizzes/{quizId}:
 *   put:
 *     tags: [Staff Quizzes]
 *     summary: Update quiz metadata
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 */
router.put('/quizzes/:quizId', QuizController.staffUpdateQuiz);

/**
 * @openapi
 * /staff/quizzes/{quizId}:
 *   delete:
 *     tags: [Staff Quizzes]
 *     summary: Delete a quiz
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 */
router.delete('/quizzes/:quizId', QuizController.staffDeleteQuiz);

/**
 * @openapi
 * /staff/quizzes/{quizId}/soft-delete:
 *   patch:
 *     tags: [Staff Quizzes]
 *     summary: Soft delete a quiz
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 */
router.patch('/quizzes/:quizId/soft-delete', QuizController.staffSoftDeleteQuiz);

/**
 * @openapi
 * /staff/quizzes/{quizId}/restore:
 *   patch:
 *     tags: [Staff Quizzes]
 *     summary: Restore a soft-deleted quiz
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 */
router.patch('/quizzes/:quizId/restore', QuizController.staffRestoreQuiz);

/**
 * @openapi
 * /staff/quizzes/{quizId}/questions:
 *   post:
 *     tags: [Staff Quizzes]
 *     summary: Add question to quiz
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 */
router.post('/quizzes/:quizId/questions', QuizController.staffAddQuestion);

/**
 * @openapi
 * /staff/quizzes/{quizId}/questions/{questionId}:
 *   put:
 *     tags: [Staff Quizzes]
 *     summary: Update a question
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 */
router.put('/quizzes/:quizId/questions/:questionId', QuizController.staffUpdateQuestion);

/**
 * @openapi
 * /staff/quizzes/{quizId}/questions/{questionId}:
 *   delete:
 *     tags: [Staff Quizzes]
 *     summary: Delete a question
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 */
router.delete('/quizzes/:quizId/questions/:questionId', QuizController.staffDeleteQuestion);

export default router;
