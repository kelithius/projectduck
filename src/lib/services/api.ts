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

  async getDirectory(path: string = '', basePath?: string): Promise<DirectoryResponse> {
    const cacheKey = basePath ? `directory:${basePath}:${path}` : `directory:${path}`;
    const cached = cacheService.get<DirectoryResponse>(cacheKey);
    
    if (cached) {
      return cached;
    }

    let url = path ? `/directory?path=${encodeURIComponent(path)}` : '/directory';
    if (basePath) {
      url += `${path ? '&' : '?'}basePath=${encodeURIComponent(basePath)}`;
    }
    
    const result = await this.request<DirectoryResponse>(url);
    
    // 如果回應包含錯誤，縮短快取時間
    const cacheTime = result.error ? 0.5 : 2;
    cacheService.set(cacheKey, result, cacheTime);
    
    return result;
  }

  async getFileContent(path: string, basePath?: string): Promise<FileContentResponse> {
    const cacheKey = basePath ? `file-content:${basePath}:${path}` : `file-content:${path}`;
    const cached = cacheService.get<FileContentResponse>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const encodedPath = encodeURIComponent(path);
    let url = `/file/content?path=${encodedPath}`;
    if (basePath) {
      url += `&basePath=${encodeURIComponent(basePath)}`;
    }
    
    const result = await this.request<FileContentResponse>(url);
    
    cacheService.set(cacheKey, result, 5);
    return result;
  }

  async getFileInfo(path: string, basePath?: string): Promise<FileInfoResponse> {
    const encodedPath = encodeURIComponent(path);
    let url = `/file/info?path=${encodedPath}`;
    if (basePath) {
      url += `&basePath=${encodeURIComponent(basePath)}`;
    }
    return this.request<FileInfoResponse>(url);
  }

  getFileRawUrl(path: string, basePath?: string): string {
    const encodedPath = encodeURIComponent(path);
    let url = `${API_BASE_URL}/file/raw?path=${encodedPath}`;
    if (basePath) {
      url += `&basePath=${encodeURIComponent(basePath)}`;
    }
    return url;
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