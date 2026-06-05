import mongoose from 'mongoose';
import Character, { ICharacter } from '../models/character.model';
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
  static async create(userId: string, data: CreateCharacterInput): Promise<ICharacter> {
    const character = await Character.create({
      createdBy: new mongoose.Types.ObjectId(userId),
      ...data,
    });
    return character;
  }

  static async findById(id: string, includeUnpublished = false, includeInactive = false): Promise<ICharacter> {
    const filter: Record<string, unknown> = {};
    
    if (!includeInactive) {
      filter.deletedAt = { $exists: false };
      filter.isActive = true;
    }
    
    if (!includeUnpublished) {
      filter.isPublished = true;
    }
    
    // Try characterId first, then _id
    let character = await Character.findOne({ ...filter, characterId: id });
    if (!character && mongoose.isValidObjectId(id)) {
      character = await Character.findOne({ ...filter, _id: id });
    }
    if (!character) {
      throw new AppError('Character not found', 404);
    }
    
    // Populate linked contexts if exists
    if (character.contextIds && character.contextIds.length > 0) {
      await character.populate({
        path: 'contextIds',
        model: 'HistoricalContext',
        select: 'contextId name description era',
      });
    }
    
    return character;
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
      Character.find(filter).populate('contextIds', 'contextId name').skip(skip).limit(pageSize).sort({ createdAt: -1 }),
      Character.countDocuments(filter),
    ]);

    // Map to include id field for FE compatibility
    const content = characters.map(char => ({
      ...char.toObject(),
      id: char._id.toString(),
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

  static async listByContextId(contextId: string, includeUnpublished = false): Promise<ICharacter[]> {
    const context = await HistoricalContext.findOne({ contextId, deletedAt: { $exists: false } });
    if (!context) {
      throw new AppError('Historical context not found', 404);
    }

    const filter: Record<string, unknown> = {
      _id: { $in: context.characterIds },
      deletedAt: { $exists: false },
      isActive: true,
    };
    
    if (!includeUnpublished) {
      filter.isPublished = true;
    }

    const characters = await Character.find(filter).populate('contextIds', 'contextId name');

    return characters;
  }

  static async update(id: string, data: UpdateCharacterInput): Promise<ICharacter> {
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

    // Try update by characterId first, then _id
    let character = await Character.findOneAndUpdate(
      { characterId: id },
      updateQuery,
      { returnDocument: 'after', runValidators: true }
    );
    if (!character && mongoose.isValidObjectId(id)) {
      character = await Character.findOneAndUpdate(
        { _id: id },
        updateQuery,
        { returnDocument: 'after', runValidators: true }
      );
    }

    if (!character) {
      throw new AppError('Character not found', 404);
    }

    return character;
  }

  static async delete(id: string): Promise<void> {
    // Try delete by characterId first, then _id
    let character = await Character.findOneAndDelete({
      characterId: id,
    });
    if (!character && mongoose.isValidObjectId(id)) {
      character = await Character.findOneAndDelete({
        _id: id,
      });
    }

    if (!character) {
      throw new AppError('Character not found', 404);
    }

    // Remove character reference from all contexts
    await HistoricalContext.updateMany(
      { characterIds: character._id },
      { $pull: { characterIds: character._id } }
    );
  }

  static async softDelete(id: string): Promise<ICharacter> {
    // Try soft delete by characterId first, then _id
    let character = await Character.findOneAndUpdate(
      { characterId: id },
      { deletedAt: new Date(), isActive: false },
      { returnDocument: 'after' }
    );
    if (!character && mongoose.isValidObjectId(id)) {
      character = await Character.findOneAndUpdate(
        { _id: id },
        { deletedAt: new Date(), isActive: false },
        { returnDocument: 'after' }
      );
    }

    if (!character) {
      throw new AppError('Character not found', 404);
    }

    return character;
  }

  static async toggleActive(id: string): Promise<ICharacter> {
    // Find by characterId or _id (allowing soft-deleted items to be found)
    let character = await Character.findOne({ characterId: id });
    if (!character && mongoose.isValidObjectId(id)) {
      character = await Character.findOne({ _id: id });
    }
    if (!character) {
      throw new AppError('Character not found', 404);
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

    const query = character.characterId ? { characterId: character.characterId } : { _id: character._id };
    const updated = await Character.findOneAndUpdate(
      query,
      updateQuery,
      { returnDocument: 'after' }
    );

    if (!updated) {
      throw new AppError('Character not found', 404);
    }

    return updated;
  }

  static async attachToContext(characterId: string, contextId: string): Promise<void> {
    // Find character by characterId or _id
    let character = await Character.findOne({ characterId, deletedAt: { $exists: false } });
    if (!character && mongoose.isValidObjectId(characterId)) {
      character = await Character.findOne({ _id: characterId, deletedAt: { $exists: false } });
    }
    const context = await HistoricalContext.findOne({ contextId, deletedAt: { $exists: false } });

    if (!character) {
      throw new AppError('Character not found', 404);
    }

    if (!context) {
      throw new AppError('Historical context not found', 404);
    }

    if (context.characterIds.some((id) => id.toString() === character._id.toString())) {
      throw new AppError('Character is already attached to this context', 400);
    }

    await HistoricalContext.findOneAndUpdate(
      { contextId },
      { $push: { characterIds: character._id } }
    );

    // Also update character with contextIds for reverse lookup
    await Character.findByIdAndUpdate(
      character._id,
      { $push: { contextIds: context._id } }
    );
  }

  static async removeFromContext(characterId: string, contextId: string): Promise<void> {
    // Find character by characterId or _id
    let character = await Character.findOne({ characterId, deletedAt: { $exists: false } });
    if (!character && mongoose.isValidObjectId(characterId)) {
      character = await Character.findOne({ _id: characterId, deletedAt: { $exists: false } });
    }
    const context = await HistoricalContext.findOne({ contextId, deletedAt: { $exists: false } });

    if (!character) throw new AppError('Character not found', 404);
    if (!context) throw new AppError('Historical context not found', 404);

    await HistoricalContext.findOneAndUpdate(
      { contextId },
      { $pull: { characterIds: character._id } }
    );

    await Character.findByIdAndUpdate(
      character._id,
      { $pull: { contextIds: context._id } }
    );
  }

  static async getContextsOfCharacter(id: string, includeUnpublished = false): Promise<any[]> {
    const populateOpts = {
      path: 'contextIds',
      match: includeUnpublished ? { deletedAt: { $exists: false } } : { isPublished: true, isActive: true, deletedAt: { $exists: false } },
    };

    // Try characterId first, then _id
    let character = await Character.findOne({ characterId: id, deletedAt: { $exists: false } }).populate(populateOpts);
    if (!character && mongoose.isValidObjectId(id)) {
      character = await Character.findOne({ _id: id, deletedAt: { $exists: false } }).populate(populateOpts);
    }
    if (!character) throw new AppError('Character not found', 404);
    return character.contextIds || [];
  }
}
