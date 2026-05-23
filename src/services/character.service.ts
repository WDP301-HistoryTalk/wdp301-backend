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
  lifespan?: string;
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

  static async findById(id: string, includeUnpublished = false): Promise<ICharacter> {
    const filter: Record<string, unknown> = { deletedAt: { $exists: false } };
    
    if (!includeUnpublished) {
      filter.isPublished = true;
      filter.isActive = true;
    }
    
    // Try characterId first, then _id
    let character = await Character.findOne({ ...filter, characterId: id });
    if (!character && mongoose.isValidObjectId(id)) {
      character = await Character.findOne({ ...filter, _id: id });
    }
    if (!character) {
      throw new AppError('Character not found', 404);
    }
    return character;
  }

  static async list(query: ListCharactersQuery): Promise<PaginationResult<ICharacter>> {
    const { search, era, page = 1, limit = 8, includeUnpublished } = query;
    // FE sends 1-indexed, convert to 0-indexed for DB
    const currentPage = Math.max(0, page - 1);
    const pageSize = limit;
    const skip = currentPage * pageSize;

    // Default: customer view (only published & active)
    const filter: Record<string, unknown> = { deletedAt: { $exists: false }, isActive: true };
    
    // If not including unpublished, filter for published only (customer view)
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
      Character.find(filter).skip(skip).limit(pageSize).sort({ createdAt: -1 }),
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

    const characters = await Character.find(filter);

    return characters;
  }

  static async update(id: string, data: UpdateCharacterInput): Promise<ICharacter> {
    // Try update by characterId first, then _id
    let character = await Character.findOneAndUpdate(
      { characterId: id, deletedAt: { $exists: false } },
      { ...data, updatedAt: new Date() },
      { returnDocument: 'after', runValidators: true }
    );
    if (!character && mongoose.isValidObjectId(id)) {
      character = await Character.findOneAndUpdate(
        { _id: id, deletedAt: { $exists: false } },
        { ...data, updatedAt: new Date() },
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
      deletedAt: { $exists: false },
    });
    if (!character && mongoose.isValidObjectId(id)) {
      character = await Character.findOneAndDelete({
        _id: id,
        deletedAt: { $exists: false },
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
      { characterId: id, deletedAt: { $exists: false } },
      { deletedAt: new Date(), isActive: false },
      { returnDocument: 'after' }
    );
    if (!character && mongoose.isValidObjectId(id)) {
      character = await Character.findOneAndUpdate(
        { _id: id, deletedAt: { $exists: false } },
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
    // Find by characterId or _id
    let character = await Character.findOne({ characterId: id, deletedAt: { $exists: false } });
    if (!character && mongoose.isValidObjectId(id)) {
      character = await Character.findOne({ _id: id, deletedAt: { $exists: false } });
    }
    if (!character) {
      throw new AppError('Character not found', 404);
    }

    // Toggle isActive
    const query = character.characterId ? { characterId: character.characterId } : { _id: character._id };
    const updated = await Character.findOneAndUpdate(
      query,
      { isActive: !character.isActive },
      { returnDocument: 'after' }
    );

    if (!updated) {
      throw new AppError('Character not found', 404);
    }

    return updated;
  }

  static async attachToContext(characterId: string, contextId: string): Promise<void> {
    const [character, context] = await Promise.all([
      Character.findOne({ characterId, deletedAt: { $exists: false } }),
      HistoricalContext.findOne({ contextId, deletedAt: { $exists: false } }),
    ]);

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

    // Also update character with contextId for reverse lookup
    await Character.findOneAndUpdate(
      { characterId },
      { contextId: context.contextId }
    );
  }
}
