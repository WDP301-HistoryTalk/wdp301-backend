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
    return await this.mapToResponse(character);
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
        select: 'name description era year',
      });
    }

    return await this.mapToResponse(character);
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
        .populate('contextIds', 'name era year')
        .populate('createdBy', 'userName')
        .skip(skip)
        .limit(pageSize)
        .sort({ createdAt: -1 }),
      Character.countDocuments(filter),
    ]);

    const content = await Promise.all(characters.map(char => this.mapToResponse(char)));

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
      .populate('contextIds', 'name era year')
      .populate('createdBy', 'userName');

    return await Promise.all(characters.map(char => this.mapToResponse(char)));
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
      .populate('contextIds', 'name era year')
      .populate('createdBy', 'userName');

    if (!character) {
      throw new AppError('Không tìm thấy nhân vật', 404);
    }

    return await this.mapToResponse(character);
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
      .populate('contextIds', 'name era year')
      .populate('createdBy', 'userName');

    if (!character) {
      throw new AppError('Không tìm thấy nhân vật', 404);
    }

    return await this.mapToResponse(character);
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
      .populate('contextIds', 'name era year')
      .populate('createdBy', 'userName');

    if (!updated) {
      throw new AppError('Không tìm thấy nhân vật', 404);
    }

    return await this.mapToResponse(updated);
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

  private static async mapToResponse(character: any): Promise<any> {
    if (!character) return null;
    const rawId = character._id || character.id;
    const charId = rawId ? rawId.toString() : '';
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
        const ctxId = ctx._id || ctx.id;
        if (ctxId) {
          return { contextId: ctxId.toString(), name: ctx.name || 'Unknown' };
        }
        return { contextId: ctx.toString(), name: 'Unknown' };
      });

    const primaryContext = contexts.length > 0 ? contexts[0] : null;

    const events = (char.contextIds || [])
      .filter((ctx: any) => ctx != null && (ctx._id || ctx.id))
      .map((ctx: any) => ({
        id: (ctx._id || ctx.id).toString(),
        name: ctx.name || 'Unknown',
        era: ctx.era || null,
        year: ctx.year ?? null,
      }));

    // imageUrl/modelUrl/videoUrl are either legacy pasted http(s) links or
    // private Supabase storage paths from the media upload-direct endpoint —
    // resolve the latter into a signed URL so every consumer (character
    // cards, chat, 3D viewer) gets a directly renderable URL.
    const { supabaseStorageService } = await import('./supabase.service');
    const [resolvedImageUrl, resolvedModelUrl, resolvedVideoUrl] = await Promise.all([
      supabaseStorageService.resolveViewUrl(char.imageUrl),
      supabaseStorageService.resolveViewUrl(char.modelUrl),
      supabaseStorageService.resolveViewUrl(char.videoUrl),
    ]);

    return {
      characterId: charId,
      name: char.name,
      title: char.title,
      background: char.background,
      image: resolvedImageUrl,
      imageUrl: resolvedImageUrl,
      videoUrl: resolvedVideoUrl ?? null,
      modelUrl: resolvedModelUrl ?? null,
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
      era: char.era || (events.length > 0 ? events[0].era : null),
      events,
      context: primaryContext,
      contexts: contexts,
      createdBy: char.createdBy ? {
        uid: (char.createdBy._id || char.createdBy.id) ? (char.createdBy._id || char.createdBy.id).toString() : char.createdBy.toString(),
        userName: char.createdBy.userName || 'Unknown'
      } : null,
      createdDate: char.createdAt,
      updatedDate: char.updatedAt
    };
  }

  static async uploadDirectMedia(
    characterId: string,
    file: Express.Multer.File,
    mediaType: string = 'IMAGE_2D'
  ): Promise<{ objectPath: string; viewUrl: string; mediaType: string }> {
    if (!file || !file.buffer) throw new AppError('File media không được để trống', 400);

    const character = await Character.findById(characterId);
    if (!character) throw new AppError('Không tìm thấy nhân vật', 404);

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

    const storagePath = `characters/${characterId}/${filename}`;

    const { supabaseStorageService } = await import('./supabase.service');
    const uploadedPath = await supabaseStorageService.uploadFile(
      storagePath,
      file.buffer,
      file.mimetype || defaultMimetype
    );

    if (mediaType === 'MODEL_3D') {
      character.modelUrl = uploadedPath;
    } else if (mediaType === 'VIDEO') {
      character.videoUrl = uploadedPath;
    } else {
      character.imageUrl = uploadedPath;
    }
    await character.save();

    const signedData = await supabaseStorageService.createSignedUrl(uploadedPath, 3600);

    return {
      objectPath: uploadedPath,
      viewUrl: signedData.url,
      mediaType,
    };
  }

  static async generateSignedViewUrl(characterId: string): Promise<{ url: string; expiresIn: number }> {
    const character = await Character.findById(characterId);
    if (!character) throw new AppError('Không tìm thấy nhân vật', 404);

    const targetUrl = character.imageUrl || character.videoUrl || character.modelUrl;
    if (!targetUrl) throw new AppError('Nhân vật chưa có media/hình ảnh/video', 400);

    if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
      return { url: targetUrl, expiresIn: 3600 };
    }

    const { supabaseStorageService } = await import('./supabase.service');
    return await supabaseStorageService.createSignedUrl(targetUrl, 3600);
  }

  static async deleteMedia(characterId: string, mediaType?: string): Promise<void> {
    const character = await Character.findById(characterId);
    if (!character) throw new AppError('Không tìm thấy nhân vật', 404);

    const { supabaseStorageService } = await import('./supabase.service');

    // With no mediaType, clear every slot (legacy "reset all media" behavior).
    // With mediaType, only touch that one slot so e.g. deleting the video
    // doesn't also wipe out the character's image/3D model.
    const clearImage = !mediaType || mediaType === 'IMAGE_2D';
    const clearVideo = !mediaType || mediaType === 'VIDEO';
    const clearModel = !mediaType || mediaType === 'MODEL_3D';

    if (clearImage && character.imageUrl && !character.imageUrl.startsWith('http')) {
      await supabaseStorageService.deleteFile(character.imageUrl);
      character.imageUrl = undefined;
    }
    if (clearVideo && character.videoUrl && !character.videoUrl.startsWith('http')) {
      await supabaseStorageService.deleteFile(character.videoUrl);
      character.videoUrl = undefined;
    }
    if (clearModel && character.modelUrl && !character.modelUrl.startsWith('http')) {
      await supabaseStorageService.deleteFile(character.modelUrl);
      character.modelUrl = undefined;
    }

    await character.save();
  }
}


