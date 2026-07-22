import { Router } from 'express';
import { QuizController } from '../controllers/quiz.controller';
import { authenticate, authorizeRoles } from '../middlewares/auth.middleware';
import { uploadCsv } from '../middlewares/upload.middleware';
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
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by quiz title
 *       - in: query
 *         name: grade
 *         schema:
 *           type: integer
 *       - in: query
 *         name: era
 *         schema:
 *           type: string
 *           enum: [ANCIENT, MEDIEVAL, MODERN, CONTEMPORARY]
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
 *         description: Quizzes retrieved successfully
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
 *                         $ref: '#/components/schemas/StaffQuizSet'
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
router.get('/quizzes', QuizController.staffListQuizzes);

/**
 * @openapi
 * /staff/quizzes/sessions:
 *   get:
 *     tags: [Staff Quizzes]
 *     summary: Get completed quiz sessions
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
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
 *         description: Quiz sessions retrieved successfully
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
router.get('/quizzes/sessions', QuizController.staffListSessions);

/**
 * @openapi
 * /staff/quizzes/sessions/{sessionId}:
 *   get:
 *     tags: [Staff Quizzes]
 *     summary: Get completed quiz session detail
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
 *         description: Quiz session detail retrieved successfully
 *       404:
 *         description: Completed quiz session not found
 */
router.get('/quizzes/sessions/:sessionId', QuizController.staffGetSessionDetail);

/**
 * @openapi
 * /staff/quizzes/reports:
 *   get:
 *     tags: [Staff Quizzes]
 *     summary: List question reports submitted by users ("Câu này có vấn đề?")
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [OPEN, RESOLVED]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 0
 *       - in: query
 *         name: size
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Question reports retrieved successfully
 */
router.get('/quizzes/reports', QuizController.staffListQuestionReports);

/**
 * @openapi
 * /staff/quizzes/reports/{reportId}/resolve:
 *   patch:
 *     tags: [Staff Quizzes]
 *     summary: Mark a question report as resolved
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Report marked as resolved
 *       404:
 *         description: Report not found
 */
router.patch('/quizzes/reports/:reportId/resolve', QuizController.staffResolveQuestionReport);

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
 *     responses:
 *       200:
 *         description: Quiz detail retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/StaffQuizSet'
 *       404:
 *         description: Quiz not found
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, contextId]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               contextId:
 *                 type: string
 *               level:
 *                 type: string
 *                 enum: [EASY, MEDIUM, HARD]
 *               isPublished:
 *                 type: boolean
 *               grade:
 *                 type: integer
 *               chapterNumber:
 *                 type: integer
 *               chapterTitle:
 *                 type: string
 *               durationSeconds:
 *                 type: integer
 *               questions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [content, options, correctAnswer]
 *                   properties:
 *                     content:
 *                       type: string
 *                     options:
 *                       type: array
 *                       items:
 *                         type: string
 *                     correctAnswer:
 *                       type: integer
 *                     orderIndex:
 *                       type: integer
 *                     explanation:
 *                       type: string
 *     responses:
 *       200:
 *         description: Quiz created successfully
 */
router.post('/quizzes', QuizController.staffCreateQuiz);

/**
 * @openapi
 * /staff/quizzes/import:
 *   post:
 *     tags: [Staff Quizzes]
 *     summary: Bulk-import quizzes from CSV
 *     description: >
 *       Upload a .csv file to bulk-create quizzes (all as drafts, isPublished=false).
 *       Rows with the same `title` are grouped into one quiz; each row is one question.
 *       Duplicate titles and invalid rows are skipped and reported in `errors[]`.
 *       Required CSV columns: title, contextId, level, questionContent,
 *       option1, option2, option3, option4, correctAnswer, explanation.
 *       Mirrors Java: POST /api/v1/staff/quizzes/import
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: A .csv file with required columns
 *     responses:
 *       200:
 *         description: CSV import completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: CSV import completed }
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalQuizzesAttempted: { type: integer }
 *                     successCount: { type: integer }
 *                     skippedCount: { type: integer }
 *                     errors:
 *                       type: array
 *                       items: { type: string }
 *                     imported:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/StaffQuizSet'
 *       400:
 *         description: Invalid file or missing CSV columns
 */
// NOTE: Must be registered BEFORE /:quizId routes so Express matches it first
router.post('/quizzes/import', uploadCsv, QuizController.staffImportQuizzes);


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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               contextId:
 *                 type: string
 *               level:
 *                 type: string
 *                 enum: [EASY, MEDIUM, HARD]
 *               isPublished:
 *                 type: boolean
 *               grade:
 *                 type: integer
 *               chapterNumber:
 *                 type: integer
 *               chapterTitle:
 *                 type: string
 *               durationSeconds:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Quiz updated successfully
 *       404:
 *         description: Quiz not found
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
 *     responses:
 *       200:
 *         description: Quiz permanently deleted successfully
 *       404:
 *         description: Quiz not found
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
 *     responses:
 *       200:
 *         description: Quiz soft deleted successfully
 *       404:
 *         description: Quiz not found
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
 *     responses:
 *       200:
 *         description: Quiz restored successfully
 *       404:
 *         description: Quiz not found
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content, options, correctAnswer]
 *             properties:
 *               content:
 *                 type: string
 *               options:
 *                 type: array
 *                 items:
 *                   type: string
 *               correctAnswer:
 *                 type: integer
 *               orderIndex:
 *                 type: integer
 *               explanation:
 *                 type: string
 *     responses:
 *       200:
 *         description: Question added successfully
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *               options:
 *                 type: array
 *                 items:
 *                   type: string
 *               correctAnswer:
 *                 type: integer
 *               orderIndex:
 *                 type: integer
 *               explanation:
 *                 type: string
 *     responses:
 *       200:
 *         description: Question updated successfully
 *       404:
 *         description: Question not found
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
 *     responses:
 *       200:
 *         description: Question deleted successfully
 *       404:
 *         description: Question not found
 */
router.delete('/quizzes/:quizId/questions/:questionId', QuizController.staffDeleteQuestion);

export default router;
