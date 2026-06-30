import mongoose from 'mongoose';
import Character from '../models/character.model';
import HistoricalContext from '../models/historical-context.model';
import { AppError } from '../utils/app-error';
import { EventEra } from '../types/enums';

export interface CreateCharacterInput {
  name: string;
  title?: string;
  background?: string;
  image?: string;
  modelUrl?: string;
  bornYear?: number;
  bornMonth?: number;
  bornDay?: number;
  isBornBc?: boolean;
  deathYear?: number;
  deathMonth?: number;
  deathDay?: number;
  isDeathBc?: boolean;
  era?: EventEra;
  personality?: string;
}

export interface UpdateCharacterInput extends Partial<CreateCharacterInput> {
  isPublished?: boolean;
  isActive?: boolean;
}

export interface ListCharactersQuery {
  search?: string;
  page?: number;
  limit?: number;
  era?: EventEra;
  includeUnpublished?: boolean; // For admin/staff only
  includeInactive?: boolean; // For admin/staff to see trashed items
}

export interface PaginationResult<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export class CharacterService {
  static async create(userId: string, data: CreateCharacterInput): Promise<any> {
    const character = await Character.create({
      createdBy: new mongoose.Types.ObjectId(userId),
      ...data,
    });
    await character.populate('createdBy', 'userName');
    return this.mapToResponse(character);
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
    const character = await Character.findOne({ ...filter, _id: id }).populate('createdBy', 'userName');
    if (!character) {
      throw new AppError('Không tìm thấy nhân vật', 404);
    }
    
    // Populate linked contexts if exists
    if (character.contextIds && character.contextIds.length > 0) {
      await character.populate({
        path: 'contextIds',
        model: 'HistoricalContext',
        select: 'name description era',
      });
    }
    
    return this.mapToResponse(character);
  }

  static async list(query: ListCharactersQuery): Promise<PaginationResult<any>> {
    const { search, era, page = 1, limit = 8, includeUnpublished, includeInactive } = query;
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

    const [characters, totalElements] = await Promise.all([
      Character.find(filter)
        .populate('contextIds', 'name')
        .populate('createdBy', 'userName')
        .skip(skip)
        .limit(pageSize)
        .sort({ createdAt: -1 }),
      Character.countDocuments(filter),
    ]);

    const content = characters.map(char => this.mapToResponse(char));

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

  static async listByContextId(contextId: string, includeUnpublished = false): Promise<any[]> {
    const context = await HistoricalContext.findOne({ _id: contextId, deletedAt: { $exists: false } });
    if (!context) {
      throw new AppError('Không tìm thấy bối cảnh lịch sử', 404);
    }

    const filter: Record<string, unknown> = {
      _id: { $in: context.characterIds },
      deletedAt: { $exists: false },
      isActive: true,
    };
    
    if (!includeUnpublished) {
      filter.isPublished = true;
    }

    const characters = await Character.find(filter)
      .populate('contextIds', 'name')
      .populate('createdBy', 'userName');

    return characters.map(char => this.mapToResponse(char));
  }

  static async update(id: string, data: UpdateCharacterInput): Promise<any> {
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
    const character = await Character.findOneAndUpdate(
      { _id: id },
      updateQuery,
      { returnDocument: 'after', runValidators: true }
    )
      .populate('contextIds', 'name')
      .populate('createdBy', 'userName');

    if (!character) {
      throw new AppError('Không tìm thấy nhân vật', 404);
    }

    return this.mapToResponse(character);
  }

  static async delete(id: string): Promise<void> {
    if (!mongoose.isValidObjectId(id)) throw new AppError('ID không hợp lệ', 400);
    const character = await Character.findOneAndDelete({
      _id: id,
    });

    if (!character) {
      throw new AppError('Không tìm thấy nhân vật', 404);
    }

    // Remove character reference from all contexts
    await HistoricalContext.updateMany(
      { characterIds: character._id },
      { $pull: { characterIds: character._id } }
    );
  }

  static async softDelete(id: string): Promise<any> {
    if (!mongoose.isValidObjectId(id)) throw new AppError('ID không hợp lệ', 400);
    const character = await Character.findOneAndUpdate(
      { _id: id },
      { deletedAt: new Date(), isActive: false },
      { returnDocument: 'after' }
    )
      .populate('contextIds', 'name')
      .populate('createdBy', 'userName');

    if (!character) {
      throw new AppError('Không tìm thấy nhân vật', 404);
    }

    return this.mapToResponse(character);
  }

  static async toggleActive(id: string): Promise<any> {
    if (!mongoose.isValidObjectId(id)) throw new AppError('ID không hợp lệ', 400);
    const character = await Character.findOne({ _id: id });
    if (!character) {
      throw new AppError('Không tìm thấy nhân vật', 404);
    }

    // Toggle isActive
    const newActiveState = !character.isActive;
    const updateQuery: any = {
      $set: { isActive: newActiveState, updatedAt: new Date() }
    };
    if (newActiveState) {
      updateQuery.$unset = { deletedAt: 1 };
    } else {
      updateQuery.$set.deletedAt = new Date();
    }

    const updated = await Character.findOneAndUpdate(
      { _id: character._id },
      updateQuery,
      { returnDocument: 'after' }
    )
      .populate('contextIds', 'name')
      .populate('createdBy', 'userName');

    if (!updated) {
      throw new AppError('Không tìm thấy nhân vật', 404);
    }

    return this.mapToResponse(updated);
  }

  static async attachToContext(characterId: string, contextId: string): Promise<void> {
    const [character, context] = await Promise.all([
      Character.findOne({ _id: characterId, deletedAt: { $exists: false } }),
      HistoricalContext.findOne({ _id: contextId, deletedAt: { $exists: false } }),
    ]);

    if (!character) {
      throw new AppError('Không tìm thấy nhân vật', 404);
    }

    if (!context) {
      throw new AppError('Không tìm thấy bối cảnh lịch sử', 404);
    }

    if (context.characterIds.some((id) => id.toString() === character._id.toString())) {
      throw new AppError('Nhân vật đã được liên kết với bối cảnh lịch sử này', 400);
    }

    await HistoricalContext.findOneAndUpdate(
      { _id: contextId },
      { $push: { characterIds: character._id } }
    );

    // Also update character with contextIds for reverse lookup
    await Character.findOneAndUpdate(
      { _id: characterId },
      { $push: { contextIds: context._id } }
    );
  }

  static async removeFromContext(characterId: string, contextId: string): Promise<void> {
    const [character, context] = await Promise.all([
      Character.findOne({ _id: characterId, deletedAt: { $exists: false } }),
      HistoricalContext.findOne({ _id: contextId, deletedAt: { $exists: false } }),
    ]);

    if (!character) throw new AppError('Không tìm thấy nhân vật', 404);
    if (!context) throw new AppError('Không tìm thấy bối cảnh lịch sử', 404);

    await HistoricalContext.findOneAndUpdate(
      { _id: contextId },
      { $pull: { characterIds: character._id } }
    );

    await Character.findOneAndUpdate(
      { _id: characterId },
      { $pull: { contextIds: context._id } }
    );
  }

  static async getContextsOfCharacter(characterId: string, includeUnpublished = false): Promise<any[]> {
    const character = await Character.findOne({ _id: characterId, deletedAt: { $exists: false } }).populate({
      path: 'contextIds',
      match: includeUnpublished ? { deletedAt: { $exists: false } } : { isPublished: true, isActive: true, deletedAt: { $exists: false } },
    });
    if (!character) throw new AppError('Không tìm thấy nhân vật', 404);
    
    // Map contexts properly to match Java's CharacterResponse.ContextInfo
    return (character.contextIds || []).map((ctx: any) => ({
      contextId: ctx._id.toString(),
      name: ctx.name
    }));
  }

  private static mapToResponse(character: any): any {
    if (!character) return null;
    const char = typeof character.toObject === 'function' ? character.toObject() : character;

    const isPublished = char.isPublished ?? false;
    let status = 'ACTIVE';
    if (char.deletedAt) {
      status = 'INACTIVE';
    } else if (!isPublished) {
      status = 'DRAFT';
    }

    // Resolve contexts
    const contexts = (char.contextIds || [])
      .filter((ctx: any) => ctx != null) // Filter out nulls from dangling references
      .map((ctx: any) => {
        // Handle both populated object and raw ObjectId
        if (ctx._id) {
          return { contextId: ctx._id.toString(), name: ctx.name || 'Unknown' };
        }
        return { contextId: ctx.toString(), name: 'Unknown' };
      });

    const primaryContext = contexts.length > 0 ? contexts[0] : null;

    return {
      characterId: char._id.toString(),
      name: char.name,
      title: char.title,
      background: char.background,
      image: char.imageUrl, // Java maps imageUrl to "image" via @JsonProperty
      modelUrl: char.modelUrl,
      personality: char.personality,
      bornYear: char.bornYear,
      bornMonth: char.bornMonth,
      bornDay: char.bornDay,
      isBornBc: char.isBornBc,
      deathYear: char.deathYear,
      deathMonth: char.deathMonth,
      deathDay: char.deathDay,
      isDeathBc: char.isDeathBc,
      isPublished: isPublished,
      status: status,
      era: char.era || null,
      events: [],
      context: primaryContext,
      contexts: contexts,
      createdBy: char.createdBy ? {
        uid: char.createdBy._id ? char.createdBy._id.toString() : char.createdBy.toString(),
        userName: char.createdBy.userName || 'Unknown'
      } : null,
      createdDate: char.createdAt,
      updatedDate: char.updatedAt
    };
  }
}
