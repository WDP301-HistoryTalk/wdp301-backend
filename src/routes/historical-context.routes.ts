import { Router } from 'express';
import { authenticate, optionalAuth } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { HistoricalContextController } from '../controllers/historical-context.controller';
import { UserRole } from '../types/enums';

const router = Router();
const staffOrAdmin = [UserRole.ContentAdmin, UserRole.SystemAdmin];

/**
 * @openapi
 * tags:
 *   name: Historical Contexts
 *   description: Historical Context management
 */

/**
 * @openapi
 * /historical-contexts:
 *   get:
 *     tags: [Historical Contexts]
 *     summary: List historical contexts
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         default: ''
 *       - in: query
 *         name: era
 *         schema:
 *           type: string
 *           enum: [ANCIENT, MEDIEVAL, MODERN, CONTEMPORARY]
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [WAR, POLITICS, CULTURE, SCIENCE, RELIGION, OTHER]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 6
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     content:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/HistoricalContextSummary'
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
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/', optionalAuth, HistoricalContextController.list);

/**
 * @openapi
 * /historical-contexts/{id}:
 *   get:
 *     tags: [Historical Contexts]
 *     summary: Get historical context by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Historical context retrieved successfully
 *       404:
 *         description: Historical context not found
 */
router.get('/:id', optionalAuth, HistoricalContextController.getById);

/**
 * @openapi
 * /historical-contexts:
 *   post:
 *     tags: [Historical Context]
 *     summary: Create a historical context (Admin/Staff only)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, era]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               era:
 *                 type: string
 *               category:
 *                 type: string
 *               year:
 *                 type: number
 *               isBC:
 *                 type: boolean
 *               location:
 *                 type: string
 *     responses:
 *       201:
 *         description: Context created successfully
 */
router.post('/', authenticate, authorize(...staffOrAdmin), HistoricalContextController.create);

/**
 * @openapi
 * /historical-contexts/{id}:
 *   put:
 *     tags: [Historical Contexts]
 *     summary: Update a historical context
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Historical context updated successfully
 *       404:
 *         description: Historical context not found
 */
router.put('/:id', authenticate, authorize(...staffOrAdmin), HistoricalContextController.update);

/**
 * @openapi
 * /historical-contexts/{id}:
 *   delete:
 *     tags: [Historical Contexts]
 *     summary: Delete a historical context
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Historical context deleted successfully
 *       404:
 *         description: Historical context not found
 */
router.delete('/:id', authenticate, authorize(...staffOrAdmin), HistoricalContextController.delete);

/**
 * @openapi
 * /historical-contexts/{id}/soft-delete:
 *   patch:
 *     tags: [Historical Contexts]
 *     summary: Soft-delete a historical context
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Historical context soft-deleted successfully
 *       404:
 *         description: Historical context not found
 */
router.patch('/:id/soft-delete', authenticate, authorize(...staffOrAdmin), HistoricalContextController.softDelete);

/**
 * @openapi
 * /historical-contexts/{id}/toggle-active:
 *   patch:
 *     tags: [Historical Contexts]
 *     summary: Toggle historical context active status
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Historical context active status toggled successfully
 *       404:
 *         description: Historical context not found
 */
router.patch('/:id/toggle-active', authenticate, authorize(...staffOrAdmin), HistoricalContextController.toggleActive);

/**
 * @openapi
 * /historical-contexts/{id}/documents:
 *   get:
 *     tags: [Historical Contexts]
 *     summary: Get documents for a historical context
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Documents retrieved successfully
 *       404:
 *         description: Historical context not found
 */
router.get('/:id/documents', optionalAuth, HistoricalContextController.getDocuments);

export default router;
