import { Router } from 'express';
import { authenticate, optionalAuth } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { CharacterController } from '../controllers/character.controller';
import { UserRole } from '../types/enums';

const router = Router();
const staffOrAdmin = [UserRole.ContentAdmin, UserRole.SystemAdmin];

/**
 * @openapi
 * tags:
 *   name: Characters
 *   description: Character management
 */

/**
 * @openapi
 * /characters:
 *   get:
 *     tags: [Characters]
 *     summary: List characters
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
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 8
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
 *                         $ref: '#/components/schemas/CharacterSummary'
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
router.get('/', optionalAuth, CharacterController.list);

/**
 * @openapi
 * /characters/context/{contextId}:
 *   get:
 *     tags: [Characters]
 *     summary: List characters by context ID
 *     parameters:
 *       - in: path
 *         name: contextId
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/context/:contextId', optionalAuth, CharacterController.listByContext);

/**
 * @openapi
 * /characters/{id}:
 *   get:
 *     tags: [Characters]
 *     summary: Get character by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/:id', optionalAuth, CharacterController.getById);

/**
 * @openapi
 * /characters:
 *   post:
 *     tags: [Character]
 *     summary: Create a new character (Admin/Staff only)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               title:
 *                 type: string
 *               background:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *               modelUrl:
 *                 type: string
 *               bornYear:
 *                 type: number
 *               deathYear:
 *                 type: number
 *               era:
 *                 type: string
 *               personality:
 *                 type: string
 *     responses:
 *       201:
 *         description: Character created successfully
 */
router.post('/', authenticate, authorize(...staffOrAdmin), CharacterController.create);

/**
 * @openapi
 * /characters/{id}:
 *   put:
 *     tags: [Characters]
 *     summary: Update a character
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.put('/:id', authenticate, authorize(...staffOrAdmin), CharacterController.update);

/**
 * @openapi
 * /characters/{id}:
 *   delete:
 *     tags: [Characters]
 *     summary: Delete a character
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.delete('/:id', authenticate, authorize(...staffOrAdmin), CharacterController.delete);

/**
 * @openapi
 * /characters/{id}/soft-delete:
 *   patch:
 *     tags: [Characters]
 *     summary: Soft-delete a character
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.patch('/:id/soft-delete', authenticate, authorize(...staffOrAdmin), CharacterController.softDelete);

/**
 * @openapi
 * /characters/{id}/toggle-active:
 *   patch:
 *     tags: [Characters]
 *     summary: Toggle character active status
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.patch('/:id/toggle-active', authenticate, authorize(...staffOrAdmin), CharacterController.toggleActive);

/**
 * @openapi
 * /characters/{characterId}/contexts/{contextId}:
 *   post:
 *     tags: [Characters]
 *     summary: Attach a character to a historical context
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: characterId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: contextId
 *         required: true
 *         schema:
 *           type: string
 */
router.post('/:characterId/contexts/:contextId', authenticate, authorize(...staffOrAdmin), CharacterController.attachToContext);

/**
 * @openapi
 * /characters/{characterId}/contexts/{contextId}:
 *   delete:
 *     tags: [Characters]
 *     summary: Remove a character from a historical context
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: characterId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: contextId
 *         required: true
 *         schema:
 *           type: string
 */
router.delete('/:characterId/contexts/:contextId', authenticate, authorize(...staffOrAdmin), CharacterController.removeFromContext);

/**
 * @openapi
 * /characters/{characterId}/contexts:
 *   get:
 *     tags: [Characters]
 *     summary: Get all contexts of a character
 *     parameters:
 *       - in: path
 *         name: characterId
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/:characterId/contexts', optionalAuth, CharacterController.getContexts);

/**
 * @openapi
 * /characters/{id}/documents:
 *   get:
 *     tags: [Characters]
 *     summary: Get documents for a character
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
 *         description: Character not found
 */
router.get('/:id/documents', optionalAuth, CharacterController.getDocuments);

export default router;
