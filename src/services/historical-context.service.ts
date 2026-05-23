import mongoose from 'mongoose';
import HistoricalContext, { IHistoricalContext } from '../models/historical-context.model';
import Character from '../models/character.model';
import { AppError } from '../utils/app-error';
import { EventEra } from '../types/enums';
import { PaginationResult } from './character.service';

export interface CreateHistoricalContextInput {
  name: string;
  description?: string;
  era: EventEra;
  year?: number;
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

  static async findById(id: string, includeUnpublished = false): Promise<IHistoricalContext> {
    const filter: Record<string, unknown> = { deletedAt: { $exists: false } };
    
    if (!includeUnpublished) {
      filter.isPublished = true;
      filter.isActive = true;
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

  static async list(query: ListHistoricalContextsQuery): Promise<PaginationResult<IHistoricalContext>> {
    const { search, era, page = 1, limit = 6, includeUnpublished } = query;
    // FE sends 1-indexed, convert to 0-indexed for DB
    const currentPage = Math.max(0, page - 1);
    const pageSize = limit;
    const skip = currentPage * pageSize;

    // Default: customer view (only published & active)
    const filter: Record<string, unknown> = { deletedAt: { $exists: false }, isActive: true };
    
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
    // Try update by contextId first, then _id
    let context = await HistoricalContext.findOneAndUpdate(
      { contextId: id, deletedAt: { $exists: false } },
      { ...data, updatedAt: new Date() },
      { returnDocument: 'after', runValidators: true }
    ).populate('characterIds');
    if (!context && mongoose.isValidObjectId(id)) {
      context = await HistoricalContext.findOneAndUpdate(
        { _id: id, deletedAt: { $exists: false } },
        { ...data, updatedAt: new Date() },
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
      deletedAt: { $exists: false },
    });
    if (!context && mongoose.isValidObjectId(id)) {
      context = await HistoricalContext.findOneAndDelete({
        _id: id,
        deletedAt: { $exists: false },
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
    // Find by contextId or _id
    let context = await HistoricalContext.findOne({ contextId: id, deletedAt: { $exists: false } });
    if (!context && mongoose.isValidObjectId(id)) {
      context = await HistoricalContext.findOne({ _id: id, deletedAt: { $exists: false } });
    }
    if (!context) {
      throw new AppError('Historical context not found', 404);
    }

    // Toggle isActive
    const query = context.contextId ? { contextId: context.contextId } : { _id: context._id };
    const updated = await HistoricalContext.findOneAndUpdate(
      query,
      { isActive: !context.isActive },
      { returnDocument: 'after' }
    );

    if (!updated) {
      throw new AppError('Historical context not found', 404);
    }

    return updated;
  }
}
