import mongoose from 'mongoose';
import HistoricalContext from '../models/historical-context.model';

import { AppError } from '../utils/app-error';
import { EventEra, EventCategory } from '../types/enums';
import { PaginationResult } from './character.service';

export interface CreateHistoricalContextInput {
  name: string;
  description?: string;
  era: EventEra;
  category?: EventCategory;
  year?: number;
  startYear?: number;
  endYear?: number;
  isBC?: boolean;
  period?: string;
  location?: string;
  imageUrl?: string;
  videoUrl?: string;
}

export interface UpdateHistoricalContextInput extends Partial<CreateHistoricalContextInput> {
  isPublished?: boolean;
  isActive?: boolean;
}

export interface ListHistoricalContextsQuery {
  search?: string;
  page?: number;
  limit?: number;
  era?: EventEra;
  category?: EventCategory;
  includeUnpublished?: boolean; // For admin/staff only
  includeInactive?: boolean; // For admin/staff only
}

export class HistoricalContextService {
  static async create(userId: string, data: CreateHistoricalContextInput): Promise<any> {
    const context = await HistoricalContext.create({
      createdBy: new mongoose.Types.ObjectId(userId),
      characterIds: [],
      ...data,
    });
    await context.populate('createdBy', 'userName');
    return await this.mapToResponse(context);
  }

  static async findById(id: string, includeUnpublished = false, includeInactive = false): Promise<any> {
    const filter: Record<string, unknown> = {};
    
    if (!includeInactive) {
      filter.deletedAt = { $exists: false };
      filter.isActive = true;
    }
    
    if (!includeUnpublished) {
      filter.isPublished = true;
    }
    
    if (!mongoose.isValidObjectId(id)) throw new AppError('ID không hợp lệ', 400);
    const context = await HistoricalContext.findOne({ ...filter, _id: id })
      .populate('characterIds')
      .populate('createdBy', 'userName');
      
    if (!context) {
      throw new AppError('Không tìm thấy bối cảnh lịch sử', 404);
    }
    return await this.mapToResponse(context);
  }

  static async list(query: ListHistoricalContextsQuery): Promise<PaginationResult<any>> {
    const { search, era, category, page = 1, limit = 6, includeUnpublished, includeInactive } = query;
    // FE sends 1-indexed, convert to 0-indexed for DB
    const currentPage = Math.max(0, page - 1);
    const pageSize = limit;
    const skip = currentPage * pageSize;

    const filter: Record<string, unknown> = {};
    
    if (!includeInactive) {
      filter.deletedAt = { $exists: false };
      filter.isActive = true;
    }
    
    if (!includeUnpublished) {
      filter.isPublished = true;
    }

    if (search) {
      filter.$text = { $search: search };
    }

    if (era) {
      filter.era = era;
    }

    if (category) {
      filter.category = category;
    }

    const [contexts, totalElements] = await Promise.all([
      HistoricalContext.find(filter)
        .populate('characterIds')
        .populate('createdBy', 'userName')
        .skip(skip)
        .limit(pageSize)
        .sort({ createdAt: -1 }),
      HistoricalContext.countDocuments(filter),
    ]);

    const content = await Promise.all(contexts.map(ctx => this.mapToResponse(ctx)));

    const totalPages = Math.ceil(totalElements / pageSize);

    return {
      content,
      totalElements,
      totalPages,
      currentPage,
      pageSize,
      hasNext: currentPage < totalPages - 1,
      hasPrevious: currentPage > 0,
    };
  }

  static async update(id: string, data: UpdateHistoricalContextInput): Promise<any> {
    const updateFields: any = { ...data, updatedAt: new Date() };
    const updateQuery: any = {};
    
    if (data.isActive !== undefined) {
      if (data.isActive === false) {
        updateFields.deletedAt = new Date();
      } else {
        updateQuery.$unset = { deletedAt: 1 };
      }
    }
    updateQuery.$set = updateFields;

    if (!mongoose.isValidObjectId(id)) throw new AppError('ID không hợp lệ', 400);
    const context = await HistoricalContext.findOneAndUpdate(
      { _id: id },
      updateQuery,
      { returnDocument: 'after', runValidators: true }
    )
      .populate('characterIds')
      .populate('createdBy', 'userName');

    if (!context) {
      throw new AppError('Không tìm thấy bối cảnh lịch sử', 404);
    }

    return await this.mapToResponse(context);
  }

  static async delete(id: string): Promise<void> {
    if (!mongoose.isValidObjectId(id)) throw new AppError('ID không hợp lệ', 400);
    const context = await HistoricalContext.findOneAndDelete({
      _id: id,
    });

    if (!context) {
      throw new AppError('Không tìm thấy bối cảnh lịch sử', 404);
    }
  }

  static async softDelete(id: string): Promise<any> {
    if (!mongoose.isValidObjectId(id)) throw new AppError('ID không hợp lệ', 400);
    const context = await HistoricalContext.findOneAndUpdate(
      { _id: id, deletedAt: { $exists: false } },
      { deletedAt: new Date(), isActive: false },
      { returnDocument: 'after' }
    ).populate('createdBy', 'userName');

    if (!context) {
      throw new AppError('Không tìm thấy bối cảnh lịch sử', 404);
    }

    return await this.mapToResponse(context);
  }

  static async toggleActive(id: string): Promise<any> {
    if (!mongoose.isValidObjectId(id)) throw new AppError('ID không hợp lệ', 400);
    const context = await HistoricalContext.findOne({ _id: id });
    if (!context) {
      throw new AppError('Không tìm thấy bối cảnh lịch sử', 404);
    }

    // Toggle isActive
    const newActiveState = !context.isActive;
    const updateQuery: any = {
      $set: { isActive: newActiveState, updatedAt: new Date() }
    };
    if (newActiveState) {
      updateQuery.$unset = { deletedAt: 1 };
    } else {
      updateQuery.$set.deletedAt = new Date();
    }

    const updated = await HistoricalContext.findOneAndUpdate(
      { _id: context._id },
      updateQuery,
      { returnDocument: 'after' }
    ).populate('createdBy', 'userName');

    if (!updated) {
      throw new AppError('Không tìm thấy bối cảnh lịch sử', 404);
    }

    return await this.mapToResponse(updated);
  }

  private static async mapToResponse(context: any): Promise<any> {
    if (!context) return null;

    const rawId = context._id || context.id;
    const ctxId = rawId ? rawId.toString() : '';
    // Support both mongoose Document and raw object
    const ctx = typeof context.toObject === 'function' ? context.toObject() : context;
    
    const isPublished = ctx.isPublished ?? false;
    let status = 'ACTIVE';
    if (ctx.deletedAt) {
      status = 'INACTIVE';
    } else if (!isPublished) {
      status = 'DRAFT';
    }

    const startYear = ctx.startYear;
    const endYear = ctx.endYear;
    const period = startYear != null && endYear != null ? `${startYear}–${endYear}` : null;
    
    const yearLabel = ctx.year != null 
        ? `${ctx.year} ${ctx.isBC ? 'TCN' : 'SCN'}` 
        : null;

    // imageUrl/videoUrl/modelUrl are either legacy pasted http(s) links or
    // private Supabase storage paths from the media upload-direct endpoint —
    // resolve the latter into a signed URL so every consumer keeps getting
    // a directly renderable URL.
    const { supabaseStorageService } = await import('./supabase.service');
    const [resolvedImageUrl, resolvedVideoUrl, resolvedModelUrl] = await Promise.all([
      supabaseStorageService.resolveViewUrl(ctx.imageUrl),
      supabaseStorageService.resolveViewUrl(ctx.videoUrl),
      supabaseStorageService.resolveViewUrl(ctx.modelUrl),
    ]);

    return {
      contextId: ctxId,
      name: ctx.name,
      description: ctx.description,
      era: ctx.era,
      category: ctx.category || null,
      year: ctx.year,
      startYear: ctx.startYear,
      endYear: ctx.endYear,
      period: period,
      yearLabel: yearLabel,
      isBC: ctx.isBC || false,
      location: ctx.location,
      imageUrl: resolvedImageUrl ?? null,
      videoUrl: resolvedVideoUrl ?? null,
      modelUrl: resolvedModelUrl ?? null,
      isPublished: isPublished,
      status: status,
      createdBy: ctx.createdBy ? {
        uid: (ctx.createdBy._id || ctx.createdBy.id) ? (ctx.createdBy._id || ctx.createdBy.id).toString() : ctx.createdBy.toString(),
        userName: ctx.createdBy.userName || 'Unknown'
      } : null,
      createdDate: ctx.createdAt,
      updatedDate: ctx.updatedAt
    };
  }

  static async uploadDirectMedia(
    contextId: string,
    file: Express.Multer.File,
    mediaType: string = 'IMAGE_2D'
  ): Promise<{ objectPath: string; viewUrl: string; mediaType: string }> {
    if (!file || !file.buffer) throw new AppError('File media không được để trống', 400);

    const context = await HistoricalContext.findById(contextId);
    if (!context) throw new AppError('Không tìm thấy bối cảnh lịch sử', 404);

    const ext = file.originalname.split('.').pop() || (mediaType === 'MODEL_3D' ? 'glb' : mediaType === 'VIDEO' ? 'mp4' : 'jpg');
    let filename = `image_2d.${ext}`;
    let defaultMimetype = 'image/jpeg';

    if (mediaType === 'MODEL_3D') {
      filename = `model_3d.${ext}`;
      defaultMimetype = 'model/gltf-binary';
    } else if (mediaType === 'VIDEO') {
      filename = `video.${ext}`;
      defaultMimetype = 'video/mp4';
    }

    const storagePath = `contexts/${contextId}/${filename}`;

    const { supabaseStorageService } = await import('./supabase.service');
    const uploadedPath = await supabaseStorageService.uploadFile(
      storagePath,
      file.buffer,
      file.mimetype || defaultMimetype
    );

    if (mediaType === 'MODEL_3D') {
      context.modelUrl = uploadedPath;
    } else if (mediaType === 'VIDEO') {
      context.videoUrl = uploadedPath;
    } else {
      context.imageUrl = uploadedPath;
    }
    await context.save();

    const signedData = await supabaseStorageService.createSignedUrl(uploadedPath, 3600);

    return {
      objectPath: uploadedPath,
      viewUrl: signedData.url,
      mediaType,
    };
  }

  static async generateSignedViewUrl(contextId: string): Promise<{ url: string; expiresIn: number }> {
    const context = await HistoricalContext.findById(contextId);
    if (!context) throw new AppError('Không tìm thấy bối cảnh lịch sử', 404);

    const targetUrl = context.imageUrl || context.videoUrl || context.modelUrl;
    if (!targetUrl) throw new AppError('Bối cảnh lịch sử chưa có media/hình ảnh/video', 400);

    if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
      return { url: targetUrl, expiresIn: 3600 };
    }

    const { supabaseStorageService } = await import('./supabase.service');
    return await supabaseStorageService.createSignedUrl(targetUrl, 3600);
  }

  static async deleteMedia(contextId: string, mediaType?: string): Promise<void> {
    const context = await HistoricalContext.findById(contextId);
    if (!context) throw new AppError('Không tìm thấy bối cảnh lịch sử', 404);

    const { supabaseStorageService } = await import('./supabase.service');

    // With no mediaType, clear every slot (legacy "reset all media" behavior).
    // With mediaType, only touch that one slot so e.g. deleting the video
    // doesn't also wipe out the context's image/3D model.
    const clearImage = !mediaType || mediaType === 'IMAGE_2D';
    const clearVideo = !mediaType || mediaType === 'VIDEO';
    const clearModel = !mediaType || mediaType === 'MODEL_3D';

    if (clearImage && context.imageUrl && !context.imageUrl.startsWith('http')) {
      await supabaseStorageService.deleteFile(context.imageUrl);
      context.imageUrl = undefined;
    }
    if (clearVideo && context.videoUrl && !context.videoUrl.startsWith('http')) {
      await supabaseStorageService.deleteFile(context.videoUrl);
      context.videoUrl = undefined;
    }
    if (clearModel && context.modelUrl && !context.modelUrl.startsWith('http')) {
      await supabaseStorageService.deleteFile(context.modelUrl);
      context.modelUrl = undefined;
    }

    await context.save();
  }
}


