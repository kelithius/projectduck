import { NextResponse } from 'next/server';
import { ProjectsResponse, ApiError } from '@/lib/types';
import projectConfigCache from '@/lib/services/projectConfigCache';

export async function GET() {
  try {
    // 從記憶體快取讀取專案配置
    const config = projectConfigCache.getProjectsFromCache();

    const response: ProjectsResponse = {
      success: true,
      data: config
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error loading projects configuration from cache:', error);
    
    // 根據錯誤類型返回適當的狀態碼
    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';
    
    if (error instanceof Error) {
      if (error.message.includes('configuration file not found')) {
        statusCode = 404;
        errorCode = 'CONFIG_NOT_FOUND';
      } else if (error.message.includes('Invalid JSON format')) {
        statusCode = 400;
        errorCode = 'INVALID_JSON';
      } else if (error.message.includes('Invalid configuration format')) {
        statusCode = 400;
        errorCode = 'INVALID_CONFIG';
      }
    }
    
    const errorResponse: ApiError = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred while loading projects',
      code: errorCode
    };
    
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}