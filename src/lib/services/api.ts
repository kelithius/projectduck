import { DirectoryResponse, FileContentResponse, FileInfoResponse } from '@/lib/types';
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

  async getDirectory(path: string = ''): Promise<DirectoryResponse> {
    const cacheKey = `directory:${path}`;
    const cached = cacheService.get<DirectoryResponse>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const url = path ? `/directory?path=${encodeURIComponent(path)}` : '/directory';
    const result = await this.request<DirectoryResponse>(url);
    
    cacheService.set(cacheKey, result, 2);
    return result;
  }

  async getFileContent(path: string): Promise<FileContentResponse> {
    const cacheKey = `file-content:${path}`;
    const cached = cacheService.get<FileContentResponse>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const encodedPath = encodeURIComponent(path);
    const result = await this.request<FileContentResponse>(`/file/content?path=${encodedPath}`);
    
    cacheService.set(cacheKey, result, 5);
    return result;
  }

  async getFileInfo(path: string): Promise<FileInfoResponse> {
    const encodedPath = encodeURIComponent(path);
    return this.request<FileInfoResponse>(`/file/info?path=${encodedPath}`);
  }

  getFileRawUrl(path: string): string {
    const encodedPath = encodeURIComponent(path);
    return `${API_BASE_URL}/file/raw?path=${encodedPath}`;
  }

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