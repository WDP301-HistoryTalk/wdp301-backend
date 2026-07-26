import { Router } from 'express';
import { authenticate, optionalAuth } from '../middlewares/auth.middleware';
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
router.get('/historical-documents', optionalAuth, DocumentController.getAllDocuments.bind(DocumentController));

/**
 * @openapi
 * /historical-documents/context/{contextId}:
 *   get:
 *     tags: [Historical Context Documents]
 *     summary: Get all documents by contextId
 */
router.get('/historical-documents/context/:contextId', optionalAuth, DocumentController.getDocumentsByContext.bind(DocumentController));

/**
 * @openapi
 * /historical-documents/{docId}:
 *   get:
 *     tags: [Historical Context Documents]
 *     summary: Get a document by ID
 */
router.get('/historical-documents/:docId', optionalAuth, DocumentController.getDocumentById.bind(DocumentController));

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
router.get('/character-documents', optionalAuth, DocumentController.getAllDocuments.bind(DocumentController));

/**
 * @openapi
 * /character-documents/character/{characterId}:
 *   get:
 *     tags: [Character Documents]
 *     summary: Get all documents by characterId
 */
router.get('/character-documents/character/:characterId', optionalAuth, DocumentController.getDocumentsByCharacter.bind(DocumentController));

/**
 * @openapi
 * /character-documents/{docId}:
 *   get:
 *     tags: [Character Documents]
 *     summary: Get a character document by ID
 */
router.get('/character-documents/:docId', optionalAuth, DocumentController.getDocumentById.bind(DocumentController));

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

/**
 * @openapi
 * /documents/{docId}/upload-pdf:
 *   post:
 *     tags: [Documents]
 *     summary: Upload PDF file for an existing document (Staff/Admin only)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: docId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: PDF file uploaded successfully
 */
router.post('/documents/:docId/upload-pdf', authenticate, authorizeRoles(UserRole.ContentAdmin, UserRole.SystemAdmin), uploadPdf, DocumentController.uploadPdfFile.bind(DocumentController));

/**
 * @openapi
 * /documents/{docId}/pdf-url:
 *   get:
 *     tags: [Documents]
 *     summary: Create a signed Supabase URL for viewing/downloading document PDF
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: docId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Signed PDF URL generated
 */
router.get('/documents/:docId/pdf-url', authenticate, DocumentController.createPdfUrl.bind(DocumentController));

/**
 * @openapi
 * /documents/pdf/extract:
 *   post:
 *     tags: [Documents]
 *     summary: Extract raw text from PDF file for frontend drafting (Stateless - no DB persistence)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: PDF text extracted successfully
 */
router.post('/documents/pdf/extract', authenticate, authorizeRoles(UserRole.ContentAdmin, UserRole.SystemAdmin), uploadPdf, DocumentController.extractPdfText.bind(DocumentController));

/**
 * @openapi
 * /documents/pdf/upload-and-extract:
 *   post:
 *     tags: [Documents]
 *     summary: Upload PDF file to Supabase Storage AND extract text in one step for frontend drafting
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
 *               file: { type: string, format: binary }
 *               entityType: { type: string, example: context }
 *               entityId: { type: string }
 *     responses:
 *       200:
 *         description: PDF uploaded to Supabase and text extracted successfully
 */
router.post('/documents/pdf/upload-and-extract', authenticate, authorizeRoles(UserRole.ContentAdmin, UserRole.SystemAdmin), uploadPdf, DocumentController.uploadAndExtractPdf.bind(DocumentController));

/**
 * @openapi
 * /documents/pdf/{docId}/save-content:
 *   post:
 *     tags: [Documents]
 *     summary: Save user-edited content to document
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: docId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content: { type: string }
 *               status: { type: string }
 *     responses:
 *       200:
 *         description: Document content saved successfully
 */
router.post('/documents/pdf/:docId/save-content', authenticate, authorizeRoles(UserRole.ContentAdmin, UserRole.SystemAdmin), DocumentController.saveDocumentContent.bind(DocumentController));
router.post('/documents/pdf/save-content', authenticate, authorizeRoles(UserRole.ContentAdmin, UserRole.SystemAdmin), DocumentController.saveDocumentContent.bind(DocumentController));

export default router;


