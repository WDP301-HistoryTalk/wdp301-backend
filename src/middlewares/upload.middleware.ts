import multer, { MulterError } from 'multer';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AppError } from '../utils/app-error';
import { config } from '../config';

/**
 * In-memory multer storage for file uploads.
 * Files are stored as Buffer on req.file.buffer — no disk I/O required.
 *
 * Max size: 5 MB (matches Java's default spring.servlet.multipart.max-file-size)
 */
const storage = multer.memoryStorage();

const formatSize = (bytes: number): string => `${Math.round(bytes / (1024 * 1024))}MB`;

/**
 * Wraps a single-file multer middleware and translates MulterError into a
 * Vietnamese AppError (so it flows through errorHandler with the standard
 * error response shape instead of Multer's raw English message).
 */
const withMulterErrorHandling = (
  uploader: RequestHandler,
  { label, maxBytes }: { label: string; maxBytes: number }
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    uploader(req, res, (err: unknown) => {
      if (!err) return next();

      if (err instanceof MulterError) {
        switch (err.code) {
          case 'LIMIT_FILE_SIZE':
            return next(
              new AppError(
                `Dung lượng ${label} vượt quá giới hạn cho phép (tối đa ${formatSize(maxBytes)})`,
                413
              )
            );
          case 'LIMIT_UNEXPECTED_FILE':
            return next(new AppError(`Trường file không hợp lệ, vui lòng gửi file với tên trường "file"`, 400));
          case 'LIMIT_FILE_COUNT':
            return next(new AppError('Chỉ được phép tải lên 1 file mỗi lần', 400));
          default:
            return next(new AppError(`Tải file lên thất bại: ${err.message}`, 400));
        }
      }

      return next(err);
    });
  };
};

export const uploadCsv = withMulterErrorHandling(
  multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (_req, file, cb) => {
      const isAccepted =
        file.mimetype === 'text/csv' ||
        file.mimetype === 'application/vnd.ms-excel' ||
        file.originalname.toLowerCase().endsWith('.csv');

      if (!isAccepted) {
        return cb(new AppError('Chỉ chấp nhận file .csv', 400));
      }
      cb(null, true);
    },
  }).single('file'),
  { label: 'file CSV', maxBytes: 5 * 1024 * 1024 }
);

export const uploadPdf = withMulterErrorHandling(
  multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB — khop voi gioi han trong DocumentService.extractPdfText
    fileFilter: (_req, file, cb) => {
      const isPdf =
        file.mimetype === 'application/pdf' ||
        file.originalname.toLowerCase().endsWith('.pdf');

      if (!isPdf) {
        return cb(new AppError('Chỉ chấp nhận file .pdf (Only .pdf files are accepted)', 400));
      }
      cb(null, true);
    },
  }).single('file'),
  { label: 'file PDF', maxBytes: 100 * 1024 * 1024 }
);

export const uploadImage = withMulterErrorHandling(
  multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter: (_req, file, cb) => {
      const isImage =
        file.mimetype.startsWith('image/') ||
        /\.(jpg|jpeg|png|webp|gif)$/i.test(file.originalname);

      if (!isImage) {
        return cb(new AppError('Chỉ chấp nhận file hình ảnh (JPEG, PNG, WEBP, GIF)', 400));
      }
      cb(null, true);
    },
  }).single('file'),
  { label: 'ảnh', maxBytes: 10 * 1024 * 1024 }
);

// Matches config.storage.mediaMaxUploadMb (Supabase's project-wide upload
// limit) — allowing more here would just mean multer accepts the file only
// for Supabase to reject it after we've already buffered the whole thing.
const mediaMaxBytes = config.storage.mediaMaxUploadMb * 1024 * 1024;

export const uploadMedia = withMulterErrorHandling(
  multer({
    storage,
    limits: { fileSize: mediaMaxBytes },
    fileFilter: (_req, file, cb) => {
      const filename = file.originalname.toLowerCase();
      const isMedia =
        file.mimetype.startsWith('image/') ||
        file.mimetype.startsWith('video/') ||
        file.mimetype === 'application/pdf' ||
        file.mimetype.includes('gltf') ||
        file.mimetype.includes('model') ||
        file.mimetype.includes('octet-stream') ||
        file.mimetype.includes('zip') ||
        /\.(jpg|jpeg|png|webp|gif|pdf|glb|gltf|obj|fbx|zip|mp4|webm|mov|avi|mkv)$/i.test(filename);

      if (!isMedia) {
        return cb(new AppError('File không đúng định dạng media hợp lệ (Ảnh, PDF, Video, Model 3D)', 400));
      }
      cb(null, true);
    },
  }).single('file'),
  { label: 'file media (ảnh/video/model)', maxBytes: mediaMaxBytes }
);
