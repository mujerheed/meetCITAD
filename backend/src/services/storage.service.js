import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import logger from '../utils/logger.js';
import config from '../config/index.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Storage Service
 * Handles file storage operations (local, S3, Cloudinary)
 */

class StorageService {
  constructor() {
    this.storageType = config.storage?.type || 'local';
    this.baseDir = 'backend/uploads';
    this.publicUrl = config.app?.backendUrl || 'http://localhost:4000';
    this.initializeStorage();
  }

  /**
   * Initialize storage based on type
   */
  async initializeStorage() {
    if (this.storageType === 'local') {
      await this.initializeLocalStorage();
    } else if (this.storageType === 's3') {
      await this.initializeS3Storage();
    } else if (this.storageType === 'cloudinary') {
      await this.initializeCloudinaryStorage();
    }
  }

  /**
   * Initialize local file storage
   */
  async initializeLocalStorage() {
    try {
      const directories = [
        'profile-pictures',
        'event-banners',
        'event-gallery',
        'qr-codes',
        'temp',
      ];

      for (const dir of directories) {
        await fs.mkdir(path.join(this.baseDir, dir), { recursive: true });
      }

      logger.info('Local storage initialized');
    } catch (error) {
      logger.error('Error initializing local storage:', error);
    }
  }

  /**
   * Initialize S3 storage
   * TODO: Implement AWS S3 integration
   */
  async initializeS3Storage() {
    logger.warn('S3 storage not yet implemented. Falling back to local storage.');
    this.storageType = 'local';
    await this.initializeLocalStorage();
  }

  /**
   * Initialize Cloudinary storage
   * TODO: Implement Cloudinary integration
   */
  async initializeCloudinaryStorage() {
    logger.warn('Cloudinary storage not yet implemented. Falling back to local storage.');
    this.storageType = 'local';
    await this.initializeLocalStorage();
  }

  /**
   * Upload file
   * @param {Buffer} fileBuffer - File buffer
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} - Upload result
   */
  async uploadFile(fileBuffer, options = {}) {
    const {
      directory = 'temp',
      fileName,
      mimeType,
      processImage = false,
      imageOptions = {},
    } = options;

    try {
      // Process image if needed
      let processedBuffer = fileBuffer;
      if (processImage && mimeType?.startsWith('image/')) {
        processedBuffer = await this.processImage(fileBuffer, imageOptions);
      }

      if (this.storageType === 'local') {
        return await this.uploadToLocal(processedBuffer, directory, fileName);
      } else if (this.storageType === 's3') {
        return await this.uploadToS3(processedBuffer, directory, fileName);
      } else if (this.storageType === 'cloudinary') {
        return await this.uploadToCloudinary(processedBuffer, directory, fileName);
      }
    } catch (error) {
      logger.error('Error uploading file:', error);
      throw new AppError('File upload failed', 500);
    }
  }

  /**
   * Upload to local storage
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} directory - Directory name
   * @param {string} fileName - File name
   * @returns {Promise<Object>}
   */
  async uploadToLocal(fileBuffer, directory, fileName) {
    try {
      const filePath = path.join(this.baseDir, directory, fileName);
      await fs.writeFile(filePath, fileBuffer);

      const url = `/uploads/${directory}/${fileName}`;

      logger.info(`File uploaded to local storage: ${url}`);
      return {
        success: true,
        url,
        fullUrl: `${this.publicUrl}${url}`,
        path: filePath,
        storage: 'local',
      };
    } catch (error) {
      logger.error('Error uploading to local storage:', error);
      throw error;
    }
  }

  /**
   * Upload to S3
   * TODO: Implement S3 upload
   */
  async uploadToS3(fileBuffer, directory, fileName) {
    throw new AppError('S3 upload not yet implemented', 501);
  }

  /**
   * Upload to Cloudinary
   * TODO: Implement Cloudinary upload
   */
  async uploadToCloudinary(fileBuffer, directory, fileName) {
    throw new AppError('Cloudinary upload not yet implemented', 501);
  }

  /**
   * Process image with Sharp
   * @param {Buffer} imageBuffer - Image buffer
   * @param {Object} options - Processing options
   * @returns {Promise<Buffer>}
   */
  async processImage(imageBuffer, options = {}) {
    const {
      width,
      height,
      quality = 90,
      format = 'jpeg',
      fit = 'cover',
    } = options;

    try {
      let pipeline = sharp(imageBuffer);

      // Resize if dimensions provided
      if (width || height) {
        pipeline = pipeline.resize(width, height, { fit });
      }

      // Convert format and set quality
      pipeline = pipeline.toFormat(format, { quality });

      return await pipeline.toBuffer();
    } catch (error) {
      logger.error('Error processing image:', error);
      throw new AppError('Image processing failed', 500);
    }
  }

  /**
   * Delete file
   * @param {string} fileUrl - File URL
   * @returns {Promise<boolean>}
   */
  async deleteFile(fileUrl) {
    try {
      if (this.storageType === 'local') {
        return await this.deleteFromLocal(fileUrl);
      } else if (this.storageType === 's3') {
        return await this.deleteFromS3(fileUrl);
      } else if (this.storageType === 'cloudinary') {
        return await this.deleteFromCloudinary(fileUrl);
      }
    } catch (error) {
      logger.error('Error deleting file:', error);
      return false;
    }
  }

  /**
   * Delete from local storage
   * @param {string} fileUrl - File URL
   * @returns {Promise<boolean>}
   */
  async deleteFromLocal(fileUrl) {
    try {
      // Extract path from URL
      const relativePath = fileUrl.replace('/uploads/', '');
      const filePath = path.join(this.baseDir, relativePath);

      await fs.unlink(filePath);
      logger.info(`File deleted from local storage: ${fileUrl}`);
      return true;
    } catch (error) {
      logger.error('Error deleting from local storage:', error);
      return false;
    }
  }

  /**
   * Delete from S3
   * TODO: Implement S3 delete
   */
  async deleteFromS3(fileUrl) {
    logger.warn('S3 delete not yet implemented');
    return false;
  }

  /**
   * Delete from Cloudinary
   * TODO: Implement Cloudinary delete
   */
  async deleteFromCloudinary(fileUrl) {
    logger.warn('Cloudinary delete not yet implemented');
    return false;
  }

  /**
   * Get file
   * @param {string} fileUrl - File URL
   * @returns {Promise<Buffer>}
   */
  async getFile(fileUrl) {
    try {
      if (this.storageType === 'local') {
        const relativePath = fileUrl.replace('/uploads/', '');
        const filePath = path.join(this.baseDir, relativePath);
        return await fs.readFile(filePath);
      } else {
        throw new AppError('Remote storage get not yet implemented', 501);
      }
    } catch (error) {
      logger.error('Error getting file:', error);
      throw new AppError('File not found', 404);
    }
  }

  /**
   * Check if file exists
   * @param {string} fileUrl - File URL
   * @returns {Promise<boolean>}
   */
  async fileExists(fileUrl) {
    try {
      if (this.storageType === 'local') {
        const relativePath = fileUrl.replace('/uploads/', '');
        const filePath = path.join(this.baseDir, relativePath);
        await fs.access(filePath);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Get file stats
   * @param {string} fileUrl - File URL
   * @returns {Promise<Object>}
   */
  async getFileStats(fileUrl) {
    try {
      if (this.storageType === 'local') {
        const relativePath = fileUrl.replace('/uploads/', '');
        const filePath = path.join(this.baseDir, relativePath);
        const stats = await fs.stat(filePath);
        
        return {
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          isFile: stats.isFile(),
        };
      } else {
        throw new AppError('Remote storage stats not yet implemented', 501);
      }
    } catch (error) {
      logger.error('Error getting file stats:', error);
      throw new AppError('File not found', 404);
    }
  }

  /**
   * Move file
   * @param {string} sourceUrl - Source file URL
   * @param {string} destinationDir - Destination directory
   * @param {string} newFileName - New file name (optional)
   * @returns {Promise<Object>}
   */
  async moveFile(sourceUrl, destinationDir, newFileName = null) {
    try {
      if (this.storageType === 'local') {
        const sourceRelativePath = sourceUrl.replace('/uploads/', '');
        const sourcePath = path.join(this.baseDir, sourceRelativePath);
        
        const fileName = newFileName || path.basename(sourcePath);
        const destPath = path.join(this.baseDir, destinationDir, fileName);

        // Ensure destination directory exists
        await fs.mkdir(path.join(this.baseDir, destinationDir), { recursive: true });

        // Move file
        await fs.rename(sourcePath, destPath);

        const newUrl = `/uploads/${destinationDir}/${fileName}`;
        
        logger.info(`File moved from ${sourceUrl} to ${newUrl}`);
        return {
          success: true,
          url: newUrl,
          fullUrl: `${this.publicUrl}${newUrl}`,
        };
      } else {
        throw new AppError('Remote storage move not yet implemented', 501);
      }
    } catch (error) {
      logger.error('Error moving file:', error);
      throw new AppError('File move failed', 500);
    }
  }

  /**
   * Copy file
   * @param {string} sourceUrl - Source file URL
   * @param {string} destinationDir - Destination directory
   * @param {string} newFileName - New file name (optional)
   * @returns {Promise<Object>}
   */
  async copyFile(sourceUrl, destinationDir, newFileName = null) {
    try {
      if (this.storageType === 'local') {
        const sourceRelativePath = sourceUrl.replace('/uploads/', '');
        const sourcePath = path.join(this.baseDir, sourceRelativePath);
        
        const fileName = newFileName || path.basename(sourcePath);
        const destPath = path.join(this.baseDir, destinationDir, fileName);

        // Ensure destination directory exists
        await fs.mkdir(path.join(this.baseDir, destinationDir), { recursive: true });

        // Copy file
        await fs.copyFile(sourcePath, destPath);

        const newUrl = `/uploads/${destinationDir}/${fileName}`;
        
        logger.info(`File copied from ${sourceUrl} to ${newUrl}`);
        return {
          success: true,
          url: newUrl,
          fullUrl: `${this.publicUrl}${newUrl}`,
        };
      } else {
        throw new AppError('Remote storage copy not yet implemented', 501);
      }
    } catch (error) {
      logger.error('Error copying file:', error);
      throw new AppError('File copy failed', 500);
    }
  }

  /**
   * Clean up temp files
   * @param {number} maxAge - Max age in milliseconds (default: 24 hours)
   * @returns {Promise<number>} - Number of files deleted
   */
  async cleanupTempFiles(maxAge = 24 * 60 * 60 * 1000) {
    try {
      const tempDir = path.join(this.baseDir, 'temp');
      const files = await fs.readdir(tempDir);
      
      let deletedCount = 0;
      const now = Date.now();

      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);
        
        const age = now - stats.mtimeMs;
        
        if (age > maxAge) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }

      logger.info(`Cleaned up ${deletedCount} temp files`);
      return deletedCount;
    } catch (error) {
      logger.error('Error cleaning up temp files:', error);
      return 0;
    }
  }

  /**
   * Get storage usage statistics
   * @returns {Promise<Object>}
   */
  async getStorageStats() {
    try {
      if (this.storageType === 'local') {
        const directories = ['profile-pictures', 'event-banners', 'event-gallery', 'qr-codes'];
        const stats = {};
        let totalSize = 0;
        let totalFiles = 0;

        for (const dir of directories) {
          const dirPath = path.join(this.baseDir, dir);
          const files = await fs.readdir(dirPath);
          
          let dirSize = 0;
          for (const file of files) {
            const filePath = path.join(dirPath, file);
            const fileStats = await fs.stat(filePath);
            dirSize += fileStats.size;
          }

          stats[dir] = {
            files: files.length,
            size: dirSize,
            sizeFormatted: this.formatBytes(dirSize),
          };

          totalSize += dirSize;
          totalFiles += files.length;
        }

        return {
          storage: this.storageType,
          directories: stats,
          total: {
            files: totalFiles,
            size: totalSize,
            sizeFormatted: this.formatBytes(totalSize),
          },
        };
      } else {
        throw new AppError('Remote storage stats not yet implemented', 501);
      }
    } catch (error) {
      logger.error('Error getting storage stats:', error);
      throw error;
    }
  }

  /**
   * Format bytes to human readable string
   * @param {number} bytes - Bytes
   * @returns {string}
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}

// Export singleton instance
export default new StorageService();
