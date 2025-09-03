import { NextRequest, NextResponse } from 'next/server';
import { ProjectAwareFileService } from '@/lib/services/projectAwareFileService';
import { FileContentResponse, ApiError } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.get('path');
    const basePath = searchParams.get('basePath');
    
    if (!path) {
      const errorResponse: ApiError = {
        success: false,
        error: 'Path parameter is required'
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }
    
    if (!basePath) {
      const errorResponse: ApiError = {
        success: false,
        error: 'BasePath parameter is required'
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }
    
    const content = await ProjectAwareFileService.getFileContent(path, basePath);
    
    const response: FileContentResponse = {
      success: true,
      data: content
    };
    
    // 添加禁用快取的標頭，確保檔案內容總是最新的
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    const errorResponse: ApiError = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    
    return NextResponse.json(errorResponse, { status: 400 });
  }
}