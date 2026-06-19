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
 *     responses:
 *       200:
 *         description: Historical contexts retrieved successfully
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

export default router;
