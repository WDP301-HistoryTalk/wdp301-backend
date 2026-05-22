import mongoose from 'mongoose';
import HistoricalContext, { IHistoricalContext } from '../models/historical-context.model';
import Character from '../models/character.model';
import { AppError } from '../utils/app-error';
import { EventEra, EventCategory } from '../types/enums';
import { PaginationResult } from './character.service';

export interface CreateHistoricalContextInput {
  name: string;
  description?: string;
  era: EventEra;
  category?: EventCategory;
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
  category?: EventCategory;
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

  static async findById(id: string): Promise<IHistoricalContext> {
    const context = await HistoricalContext.findOne({ contextId: id, deletedAt: { $exists: false } }).populate('characterIds');
    if (!context) {
      throw new AppError('Historical context not found', 404);
    }
    return context;
  }

  static async list(query: ListHistoricalContextsQuery): Promise<PaginationResult<IHistoricalContext>> {
    const { search, era, category, page = 1, limit = 6 } = query;
    // FE sends 1-indexed, convert to 0-indexed for DB
    const currentPage = Math.max(0, page - 1);
    const pageSize = limit;
    const skip = currentPage * pageSize;

    const filter: Record<string, unknown> = { deletedAt: { $exists: false } };

    if (search) {
      filter.$text = { $search: search };
    }

    if (era) {
      filter.era = era;
    }

    if (category) {
      filter.category = category;
    }

    const [content, totalElements] = await Promise.all([
      HistoricalContext.find(filter)
        .populate('characterIds')
        .skip(skip)
        .limit(pageSize)
        .sort({ createdAt: -1 }),
      HistoricalContext.countDocuments(filter),
    ]);

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
    const context = await HistoricalContext.findOneAndUpdate(
      { contextId: id, deletedAt: { $exists: false } },
      { ...data, updatedAt: new Date() },
      { returnDocument: 'after', runValidators: true }
    ).populate('characterIds');

    if (!context) {
      throw new AppError('Historical context not found', 404);
    }

    return context;
  }

  static async delete(id: string): Promise<void> {
    const context = await HistoricalContext.findOneAndDelete({
      contextId: id,
      deletedAt: { $exists: false },
    });

    if (!context) {
      throw new AppError('Historical context not found', 404);
    }
  }

  static async softDelete(id: string): Promise<IHistoricalContext> {
    const context = await HistoricalContext.findOneAndUpdate(
      { contextId: id, deletedAt: { $exists: false } },
      { deletedAt: new Date(), isActive: false },
      { returnDocument: 'after' }
    );

    if (!context) {
      throw new AppError('Historical context not found', 404);
    }

    return context;
  }

  static async toggleActive(id: string): Promise<IHistoricalContext> {
    const context = await HistoricalContext.findOne({ contextId: id, deletedAt: { $exists: false } });
    if (!context) {
      throw new AppError('Historical context not found', 404);
    }

    const updated = await HistoricalContext.findOneAndUpdate(
      { contextId: id },
      { isActive: !context.isActive },
      { returnDocument: 'after' }
    );

    if (!updated) {
      throw new AppError('Historical context not found', 404);
    }

    return updated;
  }
}
