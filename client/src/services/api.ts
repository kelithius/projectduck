import { DirectoryResponse, FileContentResponse, FileInfoResponse } from '@/types';
import { cacheService } from './cache';

const API_BASE_URL = '/api';

class ApiService {
  private async request<T>(url: string): Promise<T> {
    try {
      const response = await fetch(`${API_BASE_URL}${url}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  /**
   * 取得目錄內容
   */
  async getDirectory(path: string = ''): Promise<DirectoryResponse> {
    const cacheKey = `directory:${path}`;
    const cached = cacheService.get<DirectoryResponse>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const url = path ? `/directory?path=${encodeURIComponent(path)}` : '/directory';
    const result = await this.request<DirectoryResponse>(url);
    
    // 快取目錄結果 2 分鐘
    cacheService.set(cacheKey, result, 2);
    return result;
  }

  /**
   * 取得檔案內容
   */
  async getFileContent(path: string): Promise<FileContentResponse> {
    const cacheKey = `file-content:${path}`;
    const cached = cacheService.get<FileContentResponse>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const encodedPath = encodeURIComponent(path);
    const result = await this.request<FileContentResponse>(`/file/content?path=${encodedPath}`);
    
    // 快取檔案內容 5 分鐘
    cacheService.set(cacheKey, result, 5);
    return result;
  }

  /**
   * 取得檔案資訊
   */
  async getFileInfo(path: string): Promise<FileInfoResponse> {
    const encodedPath = encodeURIComponent(path);
    return this.request<FileInfoResponse>(`/file/info?path=${encodedPath}`);
  }

  /**
   * 取得原始檔案 URL (用於圖片、影片等)
   */
  getFileRawUrl(path: string): string {
    const encodedPath = encodeURIComponent(path);
    return `${API_BASE_URL}/file/raw?path=${encodedPath}`;
  }

  /**
   * 健康檢查
   */
  async healthCheck(): Promise<{ status: string; timestamp: string; basePath: string }> {
    try {
      const response = await fetch('/health');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }
}

export const apiService = new ApiService();
export default apiService;