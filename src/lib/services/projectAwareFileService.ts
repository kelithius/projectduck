import fs from 'fs-extra';
import path from 'path';
import mime from 'mime-types';
import { FileItem } from '@/lib/types';

interface FileContentData {
  path: string;
  content: string;
  type: string;
  encoding: string;
  size: number;
}

export class ProjectAwareFileService {
  // 專案感知的目錄內容獲取
  static async getDirectoryContentsWithBasePath(
    requestPath: string = '', 
    page: number = 1, 
    limit: number = 100,
    basePath?: string
  ): Promise<{ items: FileItem[]; totalCount: number; hasMore: boolean }> {
    
    if (!basePath) {
      throw new Error('Base path is required');
    }
    
    const effectiveBasePath = basePath;
    
    const fullPath = requestPath ? path.join(effectiveBasePath, requestPath) : effectiveBasePath;
    const safePath = this.validateProjectPath(fullPath, effectiveBasePath);
    
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
        const relativePath = path.relative(effectiveBasePath, itemPath);
        
        const fileItem: FileItem = {
          name: item,
          path: relativePath || '.',
          type: itemStats.isDirectory() ? 'directory' : 'file',
          modified: itemStats.mtime.toISOString(),
          extension: itemStats.isFile() ? path.extname(item).toLowerCase().slice(1) : undefined
        };

        fileItems.push(fileItem);
      }

      // 排序：目錄在前，然後按名稱排序
      fileItems.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

      // 分頁處理
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedItems = fileItems.slice(startIndex, endIndex);

      return {
        items: paginatedItems,
        totalCount: fileItems.length,
        hasMore: endIndex < fileItems.length
      };
    } catch (error) {
      throw error;
    }
  }

  // 錯誤處理和降級機制
  static async getDirectoryContentsWithFallback(
    requestPath: string = '', 
    page: number = 1, 
    limit: number = 100,
    basePath?: string
  ): Promise<{ 
    items: FileItem[]; 
    totalCount: number; 
    hasMore: boolean; 
    error?: string;
    fallbackUsed?: boolean;
  }> {
    try {
      const result = await this.getDirectoryContentsWithBasePath(requestPath, page, limit, basePath);
      return {
        ...result,
        fallbackUsed: false
      };
    } catch (error) {
      console.error('Primary directory access failed, using fallback');
      
      // 直接返回錯誤，不使用降級機制
      console.error('Directory access failed');
      
      return {
        items: [],
        totalCount: 0,
        hasMore: false,
        error: `Unable to access directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
        fallbackUsed: true
      };
    }
  }

  // 驗證專案路徑
  private static validateProjectPath(fullPath: string, basePath: string): string {
    // 確保路徑在 basePath 範圍內
    const resolvedFullPath = path.resolve(fullPath);
    const resolvedBasePath = path.resolve(basePath);
    
    if (!resolvedFullPath.startsWith(resolvedBasePath)) {
      throw new Error('Access denied: Path is outside the allowed directory');
    }
    
    return resolvedFullPath;
  }

  // 驗證專案路徑是否可存取
  static async validateProjectAccess(projectPath: string): Promise<{ 
    isValid: boolean; 
    error?: string; 
    isDirectory?: boolean;
  }> {
    try {
      const stats = await fs.stat(projectPath);
      
      if (!stats.isDirectory()) {
        return {
          isValid: false,
          error: 'Path is not a directory',
          isDirectory: false
        };
      }

      // 嘗試讀取目錄內容以確認權限
      await fs.readdir(projectPath);

      return {
        isValid: true,
        isDirectory: true
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        isDirectory: false
      };
    }
  }

  // 建立專案路徑的健康檢查
  static async healthCheckProject(projectPath: string): Promise<{
    healthy: boolean;
    readable: boolean;
    writable: boolean;
    error?: string;
  }> {
    try {
      // 檢查是否可讀
      await fs.access(projectPath, fs.constants.R_OK);
      const readable = true;

      // 檢查是否可寫 (非必要，但有助於完整性檢查)
      let writable = false;
      try {
        await fs.access(projectPath, fs.constants.W_OK);
        writable = true;
      } catch {
        // 寫入權限不是必需的，忽略錯誤
      }

      // 檢查是否為目錄且可列出內容
      const stats = await fs.stat(projectPath);
      if (!stats.isDirectory()) {
        return {
          healthy: false,
          readable: false,
          writable: false,
          error: 'Path is not a directory'
        };
      }

      await fs.readdir(projectPath);

      return {
        healthy: true,
        readable,
        writable
      };
    } catch (error) {
      return {
        healthy: false,
        readable: false,
        writable: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // 專案感知的檔案內容獲取
  static async getFileContent(requestPath: string, basePath: string): Promise<FileContentData> {
    if (!basePath) {
      throw new Error('Base path is required');
    }

    const effectiveBasePath = basePath;
    const fullPath = path.join(effectiveBasePath, requestPath);
    const safePath = this.validateProjectPath(fullPath, effectiveBasePath);
    
    try {
      const stats = await fs.stat(safePath);
      
      if (!stats.isFile()) {
        throw new Error('Path is not a file');
      }

      const maxSize = 10 * 1024 * 1024; // 10MB
      if (stats.size > maxSize) {
        throw new Error('File too large (max 10MB)');
      }

      const mimeType = mime.lookup(safePath) || 'text/plain';
      const content = await fs.readFile(safePath, 'utf-8');
      
      return {
        path: requestPath,
        content,
        type: mimeType,
        encoding: 'utf-8',
        size: stats.size
      };
    } catch (error) {
      throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}