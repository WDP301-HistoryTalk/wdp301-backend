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
}).single('file');

export const uploadPdf = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    const isPdf =
      file.mimetype === 'application/pdf' ||
      file.originalname.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      return cb(new AppError('Chỉ chấp nhận file .pdf (Only .pdf files are accepted)', 400));
    }
    cb(null, true);
  },
}).single('file');

export const uploadImage = multer({
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
}).single('file');

export const uploadMedia = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB for 3D models, Videos & larger media
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
}).single('file');


