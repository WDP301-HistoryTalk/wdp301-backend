import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import DocumentController from '../controllers/document.controller';

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Historical Context Documents
 *     description: Documents attached to a Historical Context (for RAG)
 *   - name: Character Documents
 *     description: Documents attached to a Character (for RAG)
 */

// ── Historical Context Documents ─────────────────────────────────────────────

/**
 * @openapi
 * /historical-documents:
 *   get:
 *     tags: [Historical Context Documents]
 *     summary: Get all context documents
 *     parameters:
 *       - in: query
 *         name: entityType
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List retrieved successfully
 */
router.get('/historical-documents', DocumentController.getAllDocuments.bind(DocumentController));

/**
 * @openapi
 * /historical-documents/context/{contextId}:
 *   get:
 *     tags: [Historical Context Documents]
 *     summary: Get all documents by contextId
 */
router.get('/historical-documents/context/:contextId', DocumentController.getDocumentsByContext.bind(DocumentController));

/**
 * @openapi
 * /historical-documents/{docId}:
 *   get:
 *     tags: [Historical Context Documents]
 *     summary: Get a document by ID
 */
router.get('/historical-documents/:docId', DocumentController.getDocumentById.bind(DocumentController));

/**
 * @openapi
 * /historical-documents:
 *   post:
 *     tags: [Historical Context Documents]
 *     summary: Upload a document for a Historical Context (Staff/Admin only)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [contextId, title, content]
 *             properties:
 *               contextId: { type: string }
 *               title: { type: string }
 *               content: { type: string }
 *               fileUrl: { type: string }
 *               type: { type: string, enum: [TEXT] }
 *     responses:
 *       201:
 *         description: Document created and queued for AI processing
 */
router.post('/historical-documents', authenticate, DocumentController.createContextDocument.bind(DocumentController));

/**
 * @openapi
 * /historical-documents/{docId}:
 *   put:
 *     tags: [Historical Context Documents]
 *     summary: Update a document
 *     security:
 *       - BearerAuth: []
 */
router.put('/historical-documents/:docId', authenticate, DocumentController.updateDocument.bind(DocumentController));

/**
 * @openapi
 * /historical-documents/{docId}:
 *   delete:
 *     tags: [Historical Context Documents]
 *     summary: Delete a document (also removes from AI vector store)
 *     security:
 *       - BearerAuth: []
 */
router.delete('/historical-documents/:docId', authenticate, DocumentController.deleteDocument.bind(DocumentController));

// ── Character Documents ────────────────────────────────────────────────────────

/**
 * @openapi
 * /character-documents:
 *   get:
 *     tags: [Character Documents]
 *     summary: Get all character documents
 */
router.get('/character-documents', DocumentController.getAllDocuments.bind(DocumentController));

/**
 * @openapi
 * /character-documents/character/{characterId}:
 *   get:
 *     tags: [Character Documents]
 *     summary: Get all documents by characterId
 */
router.get('/character-documents/character/:characterId', DocumentController.getDocumentsByCharacter.bind(DocumentController));

/**
 * @openapi
 * /character-documents/{docId}:
 *   get:
 *     tags: [Character Documents]
 *     summary: Get a character document by ID
 */
router.get('/character-documents/:docId', DocumentController.getDocumentById.bind(DocumentController));

/**
 * @openapi
 * /character-documents:
 *   post:
 *     tags: [Character Documents]
 *     summary: Upload a document for a Character (Staff/Admin only)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [characterId, title, content]
 *             properties:
 *               characterId: { type: string }
 *               title: { type: string }
 *               content: { type: string }
 *               fileUrl: { type: string }
 *               type: { type: string, enum: [TEXT] }
 *     responses:
 *       201:
 *         description: Document created and queued for AI processing
 */
router.post('/character-documents', authenticate, DocumentController.createCharacterDocument.bind(DocumentController));

/**
 * @openapi
 * /character-documents/{docId}:
 *   put:
 *     tags: [Character Documents]
 *     summary: Update a character document
 *     security:
 *       - BearerAuth: []
 */
router.put('/character-documents/:docId', authenticate, DocumentController.updateDocument.bind(DocumentController));

/**
 * @openapi
 * /character-documents/{docId}:
 *   delete:
 *     tags: [Character Documents]
 *     summary: Delete a character document (also removes from AI vector store)
 *     security:
 *       - BearerAuth: []
 */
router.delete('/character-documents/:docId', authenticate, DocumentController.deleteDocument.bind(DocumentController));

import { uploadPdf } from '../middlewares/upload.middleware';
import { authorizeRoles } from '../middlewares/auth.middleware';
import { UserRole } from '../types/enums';

router.post('/documents/:docId/upload-pdf', authenticate, authorizeRoles(UserRole.ContentAdmin, UserRole.SystemAdmin), uploadPdf, DocumentController.uploadPdfFile.bind(DocumentController));
router.get('/documents/:docId/pdf-url', authenticate, DocumentController.createPdfUrl.bind(DocumentController));


export default router;

