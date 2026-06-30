import mongoose from 'mongoose';
import HistoricalContext, { IHistoricalContext } from '../models/historical-context.model';

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
    return this.mapToResponse(context);
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
    return this.mapToResponse(context);
  }

  static async list(query: ListHistoricalContextsQuery): Promise<PaginationResult<any>> {
    const { search, era, page = 1, limit = 6, includeUnpublished, includeInactive } = query;
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

    const [contexts, totalElements] = await Promise.all([
      HistoricalContext.find(filter)
        .populate('characterIds')
        .populate('createdBy', 'userName')
        .skip(skip)
        .limit(pageSize)
        .sort({ createdAt: -1 }),
      HistoricalContext.countDocuments(filter),
    ]);

    const content = contexts.map(ctx => this.mapToResponse(ctx));

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

    return this.mapToResponse(context);
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

    return this.mapToResponse(context);
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

    return this.mapToResponse(updated);
  }

  private static mapToResponse(context: any): any {
    if (!context) return null;
    
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

    return {
      contextId: ctx._id.toString(),
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
      imageUrl: ctx.imageUrl,
      videoUrl: ctx.videoUrl,
      isPublished: isPublished,
      status: status,
      createdBy: ctx.createdBy ? {
        uid: ctx.createdBy._id ? ctx.createdBy._id.toString() : ctx.createdBy.toString(),
        userName: ctx.createdBy.userName || 'Unknown'
      } : null,
      createdDate: ctx.createdAt,
      updatedDate: ctx.updatedAt
    };
  }
}
