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
  static async create(userId: string, data: CreateHistoricalContextInput): Promise<IHistoricalContext> {
    const context = await HistoricalContext.create({
      createdBy: new mongoose.Types.ObjectId(userId),
      characterIds: [],
      ...data,
    });
    return context;
  }

  static async findById(id: string, includeUnpublished = false, includeInactive = false): Promise<IHistoricalContext> {
    const filter: Record<string, unknown> = {};
    
    if (!includeInactive) {
      filter.deletedAt = { $exists: false };
      filter.isActive = true;
    }
    
    if (!includeUnpublished) {
      filter.isPublished = true;
    }
    
    // Try contextId first, then _id
    let context = await HistoricalContext.findOne({ ...filter, contextId: id }).populate('characterIds');
    if (!context && mongoose.isValidObjectId(id)) {
      context = await HistoricalContext.findOne({ ...filter, _id: id }).populate('characterIds');
    }
    if (!context) {
      throw new AppError('Historical context not found', 404);
    }
    return context;
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
        .skip(skip)
        .limit(pageSize)
        .sort({ createdAt: -1 }),
      HistoricalContext.countDocuments(filter),
    ]);

    // Map to include id field for FE compatibility
    const content = contexts.map(ctx => ({
      ...ctx.toObject(),
      id: ctx._id.toString(),
    }));

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

  static async update(id: string, data: UpdateHistoricalContextInput): Promise<IHistoricalContext> {
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

    // Try update by contextId first, then _id
    let context = await HistoricalContext.findOneAndUpdate(
      { contextId: id },
      updateQuery,
      { returnDocument: 'after', runValidators: true }
    ).populate('characterIds');
    if (!context && mongoose.isValidObjectId(id)) {
      context = await HistoricalContext.findOneAndUpdate(
        { _id: id },
        updateQuery,
        { returnDocument: 'after', runValidators: true }
      ).populate('characterIds');
    }

    if (!context) {
      throw new AppError('Historical context not found', 404);
    }

    return context;
  }

  static async delete(id: string): Promise<void> {
    // Try delete by contextId first, then _id
    let context = await HistoricalContext.findOneAndDelete({
      contextId: id,
    });
    if (!context && mongoose.isValidObjectId(id)) {
      context = await HistoricalContext.findOneAndDelete({
        _id: id,
      });
    }

    if (!context) {
      throw new AppError('Historical context not found', 404);
    }
  }

  static async softDelete(id: string): Promise<IHistoricalContext> {
    // Try soft delete by contextId first, then _id
    let context = await HistoricalContext.findOneAndUpdate(
      { contextId: id, deletedAt: { $exists: false } },
      { deletedAt: new Date(), isActive: false },
      { returnDocument: 'after' }
    );
    if (!context && mongoose.isValidObjectId(id)) {
      context = await HistoricalContext.findOneAndUpdate(
        { _id: id, deletedAt: { $exists: false } },
        { deletedAt: new Date(), isActive: false },
        { returnDocument: 'after' }
      );
    }

    if (!context) {
      throw new AppError('Historical context not found', 404);
    }

    return context;
  }

  static async toggleActive(id: string): Promise<IHistoricalContext> {
    if (!mongoose.isValidObjectId(id)) throw new AppError('Invalid ID', 400);
    const context = await HistoricalContext.findOne({ _id: id });
    if (!context) {
      throw new AppError('Historical context not found', 404);
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
    );

    if (!updated) {
      throw new AppError('Historical context not found', 404);
    }

    return updated;
  }
}
