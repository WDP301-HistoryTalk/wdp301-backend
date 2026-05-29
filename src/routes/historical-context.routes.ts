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
 */
router.get('/:id', optionalAuth, HistoricalContextController.getById);

/**
 * @openapi
 * /historical-contexts:
 *   post:
 *     tags: [Historical Contexts]
 *     summary: Create a historical context
 *     security:
 *       - BearerAuth: []
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
 */
router.patch('/:id/toggle-active', authenticate, authorize(...staffOrAdmin), HistoricalContextController.toggleActive);

export default router;
