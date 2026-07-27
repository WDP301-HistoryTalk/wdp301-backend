import axios from 'axios';
import mongoose from 'mongoose';
import { PDFParse } from 'pdf-parse';
import { createWorker } from 'tesseract.js';
import DocumentModel from '../models/document.model';
import HistoricalContext from '../models/historical-context.model';
import Character from '../models/character.model';
import { AppError } from '../utils/app-error';
import { EntityType } from '../types/enums';
import { logger } from '../utils/logger';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001';

// PDF scan (khong co text layer) can rat nhieu trang de OCR — gioi han so
// trang de tranh mot request treo vo han (Tesseract chay CPU, ~4-5s/trang).
// 150 du headroom cho cac file dai nhat hien co (120 trang) ma van co 1 tran
// tren de chan file qua khong lo lam nghen server.
const MAX_OCR_PAGES = 150;
// Nguong mat do ky tu/trang de quyet dinh trang co "du chu that" hay khong,
// tinh tren van ban DA LOC bo cac dong print-artifact (xem stripPrintArtifacts).
const MIN_CHARS_PER_PAGE = 40;

// Nhieu PDF thuc te la ban "Print to PDF" tu mot trinh xem web (vd Scribd
// embed) voi tuy chon "Headers and footers" cua trinh duyet duoc bat — moi
// trang se co THEM 1 lop text THAT (khong phai OCR) do trinh duyet tu chen:
// ngay gio in, URL trang, va so trang dang "N/M". Lop text nay du dai de
// "qua" mot ngu?ng mat do chu ngay tho, khien code tuong trang da co du noi
// dung va bo qua OCR — trong khi anh that (noi dung sach) nam ben duoi chua
// tung duoc doc. Loc bo cac dong nay truoc khi tinh mat do de tranh bi danh
// lua boi rac lap lai deu dan nay.
const PRINT_ARTIFACT_LINE_PATTERNS = [
  /^https?:\/\/\S+$/i,
  /^\d{1,2}\/\d{1,2}\/\d{2,4},?\s+\d{1,2}:\d{2}\s*(AM|PM)?$/i,
  /^\d+\s*\/\s*\d+$/,
];

export type OcrProgressCallback = (page: number, total: number) => void;

function stripPrintArtifacts(text: string): string {
  return text
    .split('\n')
    .filter((line) => !PRINT_ARTIFACT_LINE_PATTERNS.some((re) => re.test(line.trim())))
    .join('\n')
    .trim();
}

// ─── AI Service Async Helpers ─────────────────────────────────────────────────

async function triggerAiProcess(docId: string, entityId: string, content: string): Promise<void> {
  try {
    await axios.post(`${AI_SERVICE_URL}/v1/ai/documents/process`, {
      doc_id: docId,
      entity_id: entityId,
      content,
    });
  } catch (err: any) {
    console.warn(`[DocumentService] AI process failed for ${docId}:`, err.message);
  }
}

async function triggerAiDelete(docId: string): Promise<void> {
  try {
    await axios.delete(`${AI_SERVICE_URL}/v1/ai/documents/${docId}`);
  } catch (err: any) {
    console.warn(`[DocumentService] AI delete failed for ${docId}:`, err.message);
  }
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface CreateContextDocumentInput {
  contextId: string;
  title: string;
  content: string;
  fileUrl?: string;
  type?: string;
}

export interface CreateCharacterDocumentInput {
  characterId: string;
  title: string;
  content: string;
  fileUrl?: string;
  type?: string;
}

export interface UpdateDocumentInput {
  title?: string;
  content?: string;
  fileUrl?: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class DocumentService {

  // ── Context Documents ──────────────────────────────────────────────────────

  static async createContextDocument(userId: string, data: CreateContextDocumentInput): Promise<any> {
    const context = await HistoricalContext.findOne({
      _id: data.contextId,
      deletedAt: { $exists: false },
    });
    if (!context) throw new AppError('Không tìm thấy bối cảnh lịch sử', 404);

    const doc = await DocumentModel.create({
      uploadedBy: new mongoose.Types.ObjectId(userId),
      entityId: context._id,
      entityType: EntityType.Context,
      title: data.title,
      content: data.content,
      fileUrl: data.fileUrl,
    });

    // Async AI processing — fire and forget
    const entityIdStr = context._id.toString();
    setImmediate(() => triggerAiProcess(doc._id.toString(), entityIdStr, data.content));

    await doc.populate('uploadedBy', 'userName');
    return this.mapToResponse(doc, true);
  }

  static async getDocumentsByContext(contextId: string, includeUnpublished = false): Promise<any[]> {
    const contextFilter: Record<string, unknown> = {
      _id: contextId,
      deletedAt: { $exists: false },
      isActive: true,
    };
    if (!includeUnpublished) {
      contextFilter.isPublished = true;
    }

    const context = await HistoricalContext.findOne(contextFilter);
    if (!context) throw new AppError('Không tìm thấy bối cảnh lịch sử', 404);

    const docs = await DocumentModel.find({ entityId: context._id, entityType: EntityType.Context })
      .populate('uploadedBy', 'userName')
      .sort({ createdAt: -1 });
    return docs.map(d => this.mapToResponse(d, true));
  }

  // ── Character Documents ────────────────────────────────────────────────────

  static async createCharacterDocument(userId: string, data: CreateCharacterDocumentInput): Promise<any> {
    const character = await Character.findOne({
      _id: data.characterId,
      deletedAt: { $exists: false },
    });
    if (!character) throw new AppError('Không tìm thấy nhân vật', 404);

    const doc = await DocumentModel.create({
      uploadedBy: new mongoose.Types.ObjectId(userId),
      entityId: character._id,
      entityType: EntityType.Character,
      title: data.title,
      content: data.content,
      fileUrl: data.fileUrl,
    });

    const entityIdStr = character._id.toString();
    setImmediate(() => triggerAiProcess(doc._id.toString(), entityIdStr, data.content));

    await doc.populate('uploadedBy', 'userName');
    return this.mapToResponse(doc, false);
  }

  static async getDocumentsByCharacter(characterId: string, includeUnpublished = false): Promise<any[]> {
    const characterFilter: Record<string, unknown> = {
      _id: characterId,
      deletedAt: { $exists: false },
      isActive: true,
    };
    if (!includeUnpublished) {
      characterFilter.isPublished = true;
    }

    const character = await Character.findOne(characterFilter);
    if (!character) throw new AppError('Không tìm thấy nhân vật', 404);

    const docs = await DocumentModel.find({ entityId: character._id, entityType: EntityType.Character })
      .populate('uploadedBy', 'userName')
      .sort({ createdAt: -1 });
    return docs.map(d => this.mapToResponse(d, false));
  }

  // ── Shared ────────────────────────────────────────────────────────────────

  static async getDocumentById(docId: string, includeUnpublished = false): Promise<any> {
    const doc = await DocumentModel.findById(docId).populate('uploadedBy', 'userName');
    if (!doc) throw new AppError('Không tìm thấy tài liệu', 404);

    if (!includeUnpublished) {
      const visibleFilter = { _id: doc.entityId, deletedAt: { $exists: false }, isActive: true, isPublished: true };
      const parentEntity = doc.entityType === EntityType.Context
        ? await HistoricalContext.findOne(visibleFilter)
        : await Character.findOne(visibleFilter);
      if (!parentEntity) throw new AppError('Không tìm thấy tài liệu', 404);
    }

    return this.mapToResponse(doc, doc.entityType === EntityType.Context);
  }

  static async updateDocument(docId: string, data: UpdateDocumentInput): Promise<any> {
    const doc = await DocumentModel.findByIdAndUpdate(
      docId,
      { $set: data },
      { new: true, runValidators: true }
    );
    if (!doc) throw new AppError('Không tìm thấy tài liệu', 404);

    // Re-process in AI if content changed
    if (data.content) {
      setImmediate(() => triggerAiProcess(doc._id.toString(), doc.entityId.toString(), data.content!));
    }

    await doc.populate('uploadedBy', 'userName');
    return this.mapToResponse(doc, doc.entityType === EntityType.Context);
  }

  static async uploadPdfFile(docId: string, file: Express.Multer.File, _userId: string): Promise<any> {
    if (!file || !file.buffer) throw new AppError('File PDF không được để trống', 400);

    const doc = await DocumentModel.findById(docId);
    if (!doc) throw new AppError('Không tìm thấy tài liệu', 404);

    const entityTypeStr = doc.entityType ? doc.entityType.toLowerCase() : 'context';
    const storagePath = `${entityTypeStr}/${doc.entityId}/${doc._id}.pdf`;

    const { supabaseStorageService } = await import('./supabase.service');
    const uploadedPath = await supabaseStorageService.uploadFile(storagePath, file.buffer, 'application/pdf');

    doc.fileUrl = uploadedPath;
    doc.type = 'PDF' as any;
    await doc.save();

    await doc.populate('uploadedBy', 'userName');
    return this.mapToResponse(doc, doc.entityType === EntityType.Context);
  }

  static async extractPdfText(
    fileBuffer: Buffer,
    onProgress?: OcrProgressCallback
  ): Promise<{ rawText: string; pageCount: number }> {
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new AppError('File PDF không được để trống', 400);
    }
    if (fileBuffer.length > 100 * 1024 * 1024) {
      throw new AppError('Kích thước file PDF vượt quá giới hạn 100MB', 400);
    }

    const parser = new PDFParse({ data: fileBuffer });
    let worker: Awaited<ReturnType<typeof createWorker>> | null = null;
    try {
      // pageJoiner: '' — mac dinh getText() chen marker "-- page N of M --"
      // vao cuoi moi trang, gay nhieu them cho buoc tinh mat do chu ben duoi.
      const data = await parser.getText({ pageJoiner: '' });
      const pageCount = data.total || 1;
      const pageTexts = new Array<string>(pageCount).fill('');
      let ocrPageCount = 0;

      // Xu ly tung trang mot va bao "hoan thanh" ngay sau moi trang (du la
      // lay duoc text san co hay phai OCR rieng trang do), thay vi doi xet
      // sparse tren ca tai lieu roi moi quyet dinh OCR toan bo nhu truoc.
      // Nho vay FE luon thay tien do tang dan theo trang cho moi loai PDF,
      // khong chi rieng file scan thuan can OCR ca tai lieu.
      for (const page of data.pages) {
        const raw = (page.text || '').trim();
        const meaningful = stripPrintArtifacts(raw);
        const isPageSparse = meaningful.length < MIN_CHARS_PER_PAGE;

        let pageText = raw;
        if (isPageSparse && ocrPageCount < MAX_OCR_PAGES) {
          ocrPageCount += 1;
          try {
            worker ??= await createWorker(['vie', 'eng']);
            const screenshot = await parser.getScreenshot({
              first: page.num,
              last: page.num,
              scale: 3,
              imageDataUrl: false,
            });
            const image = screenshot.pages[0];
            if (image) {
              const { data: ocrData } = await worker.recognize(Buffer.from(image.data));
              const ocrText = ocrData.text.trim();
              // OCR co the te hon text san co (vd trang co text that nhung
              // ngan that su, khong phai do scan) — giu ket qua dai hon.
              if (ocrText.length > pageText.length) pageText = ocrText;
            }
          } catch (err) {
            // Loi 1 trang (anh hong, qua lon...) khong nen huy toan bo ket
            // qua cua cac trang da xu ly thanh cong truoc do.
            logger.warn(`OCR trang ${page.num} that bai, giu text san co`, err);
          }
        }

        pageTexts[page.num - 1] = pageText;
        onProgress?.(page.num, pageCount);
      }

      const rawText = pageTexts.join('\n\n').trim();
      if (!rawText) {
        throw new AppError('Không thể trích xuất văn bản từ file PDF (kể cả sau khi OCR — file có thể bị bảo vệ hoặc ảnh scan quá mờ)', 400);
      }

      logger.debug(
        `extractPdfText: ${rawText.length} ky tu / ${pageCount} trang (${ocrPageCount} trang phai OCR)`
      );
      return { rawText, pageCount };
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      logger.error('extractPdfText that bai', err);
      throw new AppError(`Trích xuất văn bản từ PDF thất bại: ${err.message}`, 400);
    } finally {
      if (worker) await worker.terminate();
      await parser.destroy();
    }
  }

  static async uploadAndExtractPdf(
    file: Express.Multer.File,
    entityType?: string,
    entityId?: string,
    onProgress?: OcrProgressCallback
  ): Promise<{ fileUrl: string; rawText: string; pageCount: number }> {
    if (!file || !file.buffer) throw new AppError('File PDF không được để trống', 400);

    const extraction = await this.extractPdfText(file.buffer, onProgress);

    const typeStr = entityType ? entityType.toLowerCase() : 'temp';
    const idStr = entityId || 'pdf';
    const sanitizeFilename = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `documents/${typeStr}/${idStr}/${Date.now()}_${sanitizeFilename}`;

    const { supabaseStorageService } = await import('./supabase.service');
    const uploadedPath = await supabaseStorageService.uploadFile(storagePath, file.buffer, 'application/pdf');

    return {
      fileUrl: uploadedPath,
      rawText: extraction.rawText,
      pageCount: extraction.pageCount,
    };
  }

  static async saveDocumentContent(docId: string, content: string, status?: string): Promise<any> {
    if (!docId) throw new AppError('Yêu cầu truyền docId', 400);
    if (!content) throw new AppError('Nội dung không được để trống', 400);

    const doc = await DocumentModel.findById(docId);
    if (!doc) throw new AppError('Không tìm thấy tài liệu', 404);

    doc.content = content;
    if (doc.type === ('TEXT' as any)) {
      doc.type = 'MARKDOWN' as any;
    }
    if (status) {
      (doc as any).status = status;
    }
    await doc.save();

    const entityIdStr = doc.entityId.toString();
    setImmediate(() => triggerAiProcess(doc._id.toString(), entityIdStr, content));

    await doc.populate('uploadedBy', 'userName');
    return this.mapToResponse(doc, doc.entityType === EntityType.Context);
  }

  static async createPdfUrl(docId: string): Promise<{ url: string; expiresIn: number }> {
    const doc = await DocumentModel.findById(docId);
    if (!doc) throw new AppError('Không tìm thấy tài liệu', 404);
    if (!doc.fileUrl) throw new AppError('Tài liệu chưa có file PDF được tải lên', 400);

    const { supabaseStorageService } = await import('./supabase.service');
    const downloadName = `${doc.title || 'document'}.pdf`;
    return await supabaseStorageService.createSignedUrl(doc.fileUrl, 300, downloadName);
  }

  static async deleteDocument(docId: string): Promise<void> {
    const doc = await DocumentModel.findByIdAndDelete(docId);
    if (!doc) throw new AppError('Không tìm thấy tài liệu', 404);
    if (doc.fileUrl) {
      const { supabaseStorageService } = await import('./supabase.service');
      await supabaseStorageService.deleteFile(doc.fileUrl);
    }
    setImmediate(() => triggerAiDelete(docId));
  }

  static async getAllDocuments(entityType?: EntityType, includeUnpublished = false): Promise<any[]> {
    const filter: Record<string, unknown> = entityType ? { entityType } : {};

    if (!includeUnpublished) {
      const visibleFilter = { deletedAt: { $exists: false }, isActive: true, isPublished: true };
      const [contextIds, characterIds] = await Promise.all([
        entityType && entityType !== EntityType.Context ? [] : HistoricalContext.find(visibleFilter).distinct('_id'),
        entityType && entityType !== EntityType.Character ? [] : Character.find(visibleFilter).distinct('_id'),
      ]);
      filter.entityId = { $in: [...contextIds, ...characterIds] };
    }

    const docs = await DocumentModel.find(filter)
      .populate('uploadedBy', 'userName')
      .sort({ createdAt: -1 });
    return docs.map(d => this.mapToResponse(d, d.entityType === EntityType.Context));
  }

  private static mapToResponse(doc: any, isContext: boolean): any {
    if (!doc) return null;
    const rawId = doc._id || doc.id;
    const docIdStr = rawId ? rawId.toString() : '';
    const document = typeof doc.toObject === 'function' ? doc.toObject() : doc;

    // Derive type: use DB value if present; fall back based on whether a PDF was uploaded
    const resolvedType = document.type || (document.fileUrl ? 'PDF' : 'TEXT');

    const baseResponse: any = {
      docId: docIdStr,
      uid: (document.uploadedBy?._id || document.uploadedBy?.id) ? (document.uploadedBy._id || document.uploadedBy.id).toString() : document.uploadedBy?.toString() || '',
      userName: document.uploadedBy?.userName || 'Unknown',
      title: document.title,
      content: document.content,
      fileUrl: document.fileUrl || null,
      type: resolvedType,
      uploadDate: document.createdAt,
      updatedDate: document.updatedAt,
      deletedAt: document.deletedAt || null,
    };

    if (isContext) {
      baseResponse.contextId = (document.entityId._id || document.entityId.id || document.entityId).toString();
    } else {
      baseResponse.characterId = (document.entityId._id || document.entityId.id || document.entityId).toString();
    }

    return baseResponse;
  }

}

export default DocumentService;
