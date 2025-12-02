import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { AppError } from './errorHandler.js';
import logger from '../utils/logger.js';

// Allowed file types
const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const DOCUMENT_TYPES = ['application/pdf'];
const ALLOWED_TYPES = [...IMAGE_TYPES, ...DOCUMENT_TYPES];

// File size limits (in bytes)
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB

// Upload directories
const UPLOAD_DIRS = {
  profilePictures: 'backend/uploads/profile-pictures',
  eventBanners: 'backend/uploads/event-banners',
  eventGallery: 'backend/uploads/event-gallery',
  certificates: 'backend/certificates',
  templates: 'backend/templates',
  temp: 'backend/uploads/temp',
};

/**
 * Ensure upload directories exist
 */
const ensureUploadDirs = async () => {
  try {
    for (const dir of Object.values(UPLOAD_DIRS)) {
      await fs.mkdir(dir, { recursive: true });
    }
  } catch (error) {
    logger.error('Error creating upload directories:', error);
  }
};

// Initialize directories
ensureUploadDirs();

/**
 * Generate unique filename
 */
const generateFilename = (originalname) => {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  const ext = path.extname(originalname);
  return `${timestamp}-${randomString}${ext}`;
};

/**
 * Multer storage configuration (memory storage for processing)
 */
const multerStorage = multer.memoryStorage();

/**
 * Multer file filter
 */
const multerFilter = (allowedTypes = ALLOWED_TYPES) => {
  return (req, file, cb) => {
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new AppError(
          `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
          400
        ),
        false
      );
    }
  };
};

/**
 * Base multer upload configuration
 */
const createUploader = (options = {}) => {
  const {
    allowedTypes = ALLOWED_TYPES,
    maxSize = MAX_IMAGE_SIZE,
    maxFiles = 1,
  } = options;

  return multer({
    storage: multerStorage,
    fileFilter: multerFilter(allowedTypes),
    limits: {
      fileSize: maxSize,
      files: maxFiles,
    },
  });
};

/**
 * Process and save image
 */
const processImage = async (file, outputPath, options = {}) => {
  const {
    width = 800,
    height = 800,
    quality = 90,
    fit = 'cover',
    format = 'jpeg',
  } = options;

  try {
    await sharp(file.buffer)
      .resize(width, height, { fit })
      .toFormat(format, { quality })
      .toFile(outputPath);

    logger.info(`Image processed and saved: ${outputPath}`);
    return outputPath;
  } catch (error) {
    logger.error('Error processing image:', error);
    throw new AppError('Error processing image', 500);
  }
};

/**
 * Save file to disk
 */
const saveFile = async (file, directory) => {
  try {
    const filename = generateFilename(file.originalname);
    const filepath = path.join(directory, filename);

    await fs.writeFile(filepath, file.buffer);

    logger.info(`File saved: ${filepath}`);
    return filepath;
  } catch (error) {
    logger.error('Error saving file:', error);
    throw new AppError('Error saving file', 500);
  }
};

/**
 * Delete file
 */
export const deleteFile = async (filepath) => {
  try {
    await fs.unlink(filepath);
    logger.info(`File deleted: ${filepath}`);
    return true;
  } catch (error) {
    logger.error('Error deleting file:', error);
    return false;
  }
};

// ==================== PROFILE PICTURE UPLOAD ====================

/**
 * Upload profile picture
 */
export const uploadProfilePicture = createUploader({
  allowedTypes: IMAGE_TYPES,
  maxSize: MAX_IMAGE_SIZE,
  maxFiles: 1,
}).single('profileImage');

/**
 * Process profile picture
 */
export const processProfilePicture = async (req, res, next) => {
  if (!req.file) return next();

  try {
    const filename = generateFilename(req.file.originalname);
    const outputPath = path.join(UPLOAD_DIRS.profilePictures, filename);

    await processImage(req.file, outputPath, {
      width: 400,
      height: 400,
      fit: 'cover',
      quality: 85,
    });

    // Store relative path in request
    req.file.path = `/uploads/profile-pictures/${filename}`;
    req.body.profileImage = req.file.path;

    next();
  } catch (error) {
    next(error);
  }
};

// ==================== EVENT BANNER UPLOAD ====================

/**
 * Upload event banner
 */
export const uploadEventBanner = createUploader({
  allowedTypes: IMAGE_TYPES,
  maxSize: MAX_IMAGE_SIZE,
  maxFiles: 1,
}).single('bannerImage');

/**
 * Process event banner
 */
export const processEventBanner = async (req, res, next) => {
  if (!req.file) return next();

  try {
    const filename = generateFilename(req.file.originalname);
    const outputPath = path.join(UPLOAD_DIRS.eventBanners, filename);

    await processImage(req.file, outputPath, {
      width: 1200,
      height: 630,
      fit: 'cover',
      quality: 90,
    });

    // Also create thumbnail
    const thumbnailFilename = `thumb-${filename}`;
    const thumbnailPath = path.join(UPLOAD_DIRS.eventBanners, thumbnailFilename);

    await processImage(req.file, thumbnailPath, {
      width: 400,
      height: 210,
      fit: 'cover',
      quality: 80,
    });

    req.file.path = `/uploads/event-banners/${filename}`;
    req.file.thumbnailPath = `/uploads/event-banners/${thumbnailFilename}`;
    
    req.body.bannerImage = req.file.path;
    req.body.thumbnail = req.file.thumbnailPath;

    next();
  } catch (error) {
    next(error);
  }
};

// ==================== EVENT GALLERY UPLOAD ====================

/**
 * Upload event gallery images
 */
export const uploadEventGallery = createUploader({
  allowedTypes: IMAGE_TYPES,
  maxSize: MAX_IMAGE_SIZE,
  maxFiles: 10,
}).array('galleryImages', 10);

/**
 * Process event gallery images
 */
export const processEventGallery = async (req, res, next) => {
  if (!req.files || req.files.length === 0) return next();

  try {
    const galleryPaths = [];

    for (const file of req.files) {
      const filename = generateFilename(file.originalname);
      const outputPath = path.join(UPLOAD_DIRS.eventGallery, filename);

      await processImage(file, outputPath, {
        width: 1000,
        height: 750,
        fit: 'inside',
        quality: 85,
      });

      galleryPaths.push(`/uploads/event-gallery/${filename}`);
    }

    req.body.gallery = galleryPaths;
    next();
  } catch (error) {
    next(error);
  }
};

// ==================== CERTIFICATE TEMPLATE UPLOAD ====================

/**
 * Upload certificate template
 */
export const uploadCertificateTemplate = createUploader({
  allowedTypes: [...IMAGE_TYPES, ...DOCUMENT_TYPES],
  maxSize: MAX_DOCUMENT_SIZE,
  maxFiles: 1,
}).single('templateFile');

/**
 * Process certificate template
 */
export const processCertificateTemplate = async (req, res, next) => {
  if (!req.file) return next();

  try {
    const filename = generateFilename(req.file.originalname);
    const outputPath = path.join(UPLOAD_DIRS.templates, filename);

    // If it's an image, process it
    if (IMAGE_TYPES.includes(req.file.mimetype)) {
      await processImage(req.file, outputPath, {
        width: 2480, // A4 width at 300 DPI
        height: 3508, // A4 height at 300 DPI
        fit: 'inside',
        quality: 95,
      });
    } else {
      // For PDFs, just save as is
      await saveFile(req.file, UPLOAD_DIRS.templates);
    }

    req.file.path = `/templates/${filename}`;
    req.body.backgroundImage = req.file.path;

    next();
  } catch (error) {
    next(error);
  }
};

// ==================== SIGNATURE UPLOAD ====================

/**
 * Upload signature image
 */
export const uploadSignature = createUploader({
  allowedTypes: IMAGE_TYPES,
  maxSize: 2 * 1024 * 1024, // 2MB
  maxFiles: 3, // Allow multiple signatures
}).array('signatures', 3);

/**
 * Process signature images
 */
export const processSignatures = async (req, res, next) => {
  if (!req.files || req.files.length === 0) return next();

  try {
    const signaturePaths = [];

    for (const file of req.files) {
      const filename = generateFilename(file.originalname);
      const outputPath = path.join(UPLOAD_DIRS.templates, filename);

      await processImage(file, outputPath, {
        width: 500,
        height: 150,
        fit: 'inside',
        quality: 90,
        format: 'png', // PNG for transparency
      });

      signaturePaths.push(`/templates/${filename}`);
    }

    req.body.signatureImages = signaturePaths;
    next();
  } catch (error) {
    next(error);
  }
};

// ==================== GENERAL FILE UPLOAD ====================

/**
 * Upload any file (generic)
 */
export const uploadFile = createUploader({
  allowedTypes: ALLOWED_TYPES,
  maxSize: MAX_DOCUMENT_SIZE,
  maxFiles: 1,
}).single('file');

/**
 * Upload multiple files
 */
export const uploadMultipleFiles = (maxFiles = 5) => {
  return createUploader({
    allowedTypes: ALLOWED_TYPES,
    maxSize: MAX_DOCUMENT_SIZE,
    maxFiles,
  }).array('files', maxFiles);
};

// ==================== ERROR HANDLERS ====================

/**
 * Handle Multer errors
 */
export const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('File too large. Maximum size is 5MB for images.', 400));
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return next(new AppError('Too many files uploaded.', 400));
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(new AppError('Unexpected field in file upload.', 400));
    }
    return next(new AppError('File upload error: ' + err.message, 400));
  }
  next(err);
};

/**
 * Validate file exists
 */
export const requireFile = (fieldName = 'file') => {
  return (req, res, next) => {
    if (!req.file && (!req.files || req.files.length === 0)) {
      return next(new AppError(`${fieldName} is required`, 400));
    }
    next();
  };
};

/**
 * Clean up temp files on error
 */
export const cleanupOnError = async (err, req, res, next) => {
  if (err && req.file) {
    await deleteFile(req.file.path);
  }
  if (err && req.files) {
    for (const file of req.files) {
      await deleteFile(file.path);
    }
  }
  next(err);
};

export default {
  uploadProfilePicture,
  processProfilePicture,
  uploadEventBanner,
  processEventBanner,
  uploadEventGallery,
  processEventGallery,
  uploadCertificateTemplate,
  processCertificateTemplate,
  uploadSignature,
  processSignatures,
  uploadFile,
  uploadMultipleFiles,
  handleMulterError,
  requireFile,
  cleanupOnError,
  deleteFile,
};
