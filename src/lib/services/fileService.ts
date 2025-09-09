import fs from 'fs-extra';
import path from 'path';
import mime from 'mime-types';
import { SecurityService } from './securityService';
import { FileItem } from '@/lib/types';
import { appConfig } from '@/lib/services/appConfigService';

interface FileContentData {
  path: string;
  content: string;
  type: string;
  encoding: string;
  size: number;
}

interface FileInfoData {
  path: string;
  name: string;
  size: number;
  type: string;
  modified: string;
  extension?: string;
}

export class FileService {
  static async getDirectoryContents(
    requestPath: string = '', 
    page: number = 1, 
    limit: number = 100,
    basePath: string
  ): Promise<{ items: FileItem[]; totalCount: number; hasMore: boolean }> {
    const safePath = SecurityService.validatePath(requestPath, basePath);
    
    try {
      const stats = await fs.stat(safePath);
      
      if (!stats.isDirectory()) {
        throw new Error('Path is not a directory');
      }

      const items = await fs.readdir(safePath);
      const fileItems: FileItem[] = [];

      for (const item of items) {
        const itemPath = path.join(safePath, item);
        const itemStats = await fs.stat(itemPath);
        const relativePath = SecurityService.getRelativePath(itemPath, basePath);
        
        const fileItem: FileItem = {
          name: item,
          path: relativePath,
          type: itemStats.isDirectory() ? 'directory' : 'file',
          size: itemStats.isFile() ? itemStats.size : undefined,
          modified: itemStats.mtime.toISOString(),
          extension: itemStats.isFile() ? path.extname(item).slice(1) : undefined
        };

        fileItems.push(fileItem);
      }
      
      fileItems.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

      const totalCount = fileItems.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedItems = fileItems.slice(startIndex, endIndex);
      const hasMore = endIndex < totalCount;
      
      return {
        items: paginatedItems,
        totalCount,
        hasMore
      };
    } catch (error) {
      throw new Error(`Failed to read directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async getFileContent(requestPath: string, basePath: string): Promise<FileContentData> {
    const safePath = SecurityService.validatePath(requestPath, basePath);
    
    try {
      const stats = await fs.stat(safePath);
      
      if (!stats.isFile()) {
        throw new Error('Path is not a file');
      }

      const maxSize = appConfig.getMaxFileSize();
      const maxSizeMB = maxSize / (1024 * 1024);
      if (stats.size > maxSize) {
        throw new Error(`File too large (max ${maxSizeMB}MB)`);
      }

      const mimeType = mime.lookup(safePath) || 'text/plain';
      const content = await fs.readFile(safePath, 'utf-8');
      
      return {
        path: SecurityService.getRelativePath(safePath, basePath),
        content,
        type: mimeType,
        encoding: 'utf-8',
        size: stats.size
      };
    } catch (error) {
      throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async getFileInfo(requestPath: string, basePath: string): Promise<FileInfoData> {
    const safePath = SecurityService.validatePath(requestPath, basePath);
    
    try {
      const stats = await fs.stat(safePath);
      const mimeType = stats.isFile() ? (mime.lookup(safePath) || 'text/plain') : 'directory';
      
      return {
        path: SecurityService.getRelativePath(safePath, basePath),
        name: path.basename(safePath),
        size: stats.size,
        type: mimeType,
        modified: stats.mtime.toISOString(),
        extension: stats.isFile() ? path.extname(safePath).slice(1) : undefined
      };
    } catch (error) {
      throw new Error(`Failed to get file info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async pathExists(requestPath: string, basePath: string): Promise<boolean> {
    try {
      const safePath = SecurityService.validatePath(requestPath, basePath);
      return await fs.pathExists(safePath);
    } catch {
      return false;
    }
  }

  static async getFileStream(requestPath: string, basePath: string): Promise<fs.ReadStream> {
    const safePath = SecurityService.validatePath(requestPath, basePath);
    
    try {
      const stats = await fs.stat(safePath);
      
      if (!stats.isFile()) {
        throw new Error('Path is not a file');
      }

      return fs.createReadStream(safePath);
    } catch (error) {
      throw new Error(`Failed to create file stream: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}