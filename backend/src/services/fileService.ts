import fs from 'fs-extra';
import path from 'path';
import mime from 'mime-types';
import { SecurityService } from './securityService';
import { FileItem, FileContentResponse, FileInfoResponse } from '../types';

export class FileService {
  /**
   * 取得目錄內容列表
   */
  static async getDirectoryContents(requestPath: string = ''): Promise<FileItem[]> {
    const safePath = SecurityService.validatePath(requestPath);
    
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
        const relativePath = SecurityService.getRelativePath(itemPath);
        
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

      // 排序：目錄在前，檔案在後，然後按名稱排序
      fileItems.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

      return fileItems;
    } catch (error) {
      throw new Error(`Failed to read directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 取得檔案內容
   */
  static async getFileContent(requestPath: string): Promise<FileContentResponse['data']> {
    const safePath = SecurityService.validatePath(requestPath);
    
    try {
      const stats = await fs.stat(safePath);
      
      if (!stats.isFile()) {
        throw new Error('Path is not a file');
      }

      // 檢查檔案大小限制 (10MB)
      const maxSize = 10 * 1024 * 1024;
      if (stats.size > maxSize) {
        throw new Error('File too large (max 10MB)');
      }

      const mimeType = mime.lookup(safePath) || 'text/plain';
      const content = await fs.readFile(safePath, 'utf-8');

      return {
        path: SecurityService.getRelativePath(safePath),
        content,
        type: mimeType,
        encoding: 'utf-8',
        size: stats.size
      };
    } catch (error) {
      throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 取得檔案資訊
   */
  static async getFileInfo(requestPath: string): Promise<FileInfoResponse['data']> {
    const safePath = SecurityService.validatePath(requestPath);
    
    try {
      const stats = await fs.stat(safePath);
      const mimeType = stats.isFile() ? (mime.lookup(safePath) || 'text/plain') : 'directory';
      
      return {
        path: SecurityService.getRelativePath(safePath),
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

  /**
   * 檢查路徑是否存在
   */
  static async pathExists(requestPath: string): Promise<boolean> {
    try {
      const safePath = SecurityService.validatePath(requestPath);
      return await fs.pathExists(safePath);
    } catch {
      return false;
    }
  }

  /**
   * 取得檔案串流 (用於二進位檔案)
   */
  static async getFileStream(requestPath: string): Promise<fs.ReadStream> {
    const safePath = SecurityService.validatePath(requestPath);
    
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