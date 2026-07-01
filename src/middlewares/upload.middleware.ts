import multer from 'multer';
import { AppError } from '../utils/app-error';

/**
 * In-memory multer storage for file uploads.
 * Files are stored as Buffer on req.file.buffer — no disk I/O required.
 *
 * Max size: 5 MB (matches Java's default spring.servlet.multipart.max-file-size)
 */
const storage = multer.memoryStorage();

export const uploadCsv = multer({
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
}).single('file'); // field name = 'file'  (matches Java @RequestPart("file"))
