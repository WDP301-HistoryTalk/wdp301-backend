import { Router } from 'express';
import { SystemTrashController } from '../controllers/system-trash.controller';
import { authenticate, authorizeRoles } from '../middlewares/auth.middleware';
import { UserRole } from '../types/enums';

const router = Router();

// Require authentication and specific roles for all trash operations
router.use(authenticate);
router.use(authorizeRoles(UserRole.ContentAdmin, UserRole.SystemAdmin));

// GET trashed items
router.get('/characters', SystemTrashController.getDeletedCharacters);
router.get('/historical-contexts', SystemTrashController.getDeletedContexts);
router.get('/quizzes', SystemTrashController.getDeletedQuizzes);

// RESTORE trashed items
router.patch('/characters/restore', SystemTrashController.restoreCharacters);
router.patch('/historical-contexts/restore', SystemTrashController.restoreContexts);
router.patch('/quizzes/restore', SystemTrashController.restoreQuizzes);

// HARD DELETE trashed items
router.delete('/characters', SystemTrashController.hardDeleteCharacters);
router.delete('/historical-contexts', SystemTrashController.hardDeleteContexts);
router.delete('/quizzes', SystemTrashController.hardDeleteQuizzes);

export default router;
