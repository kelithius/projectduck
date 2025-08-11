import { NextRequest, NextResponse } from 'next/server';
import { ProjectAwareFileService } from '@/lib/services/projectAwareFileService';
import { DirectoryResponse, ApiError } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.get('path') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const basePath = searchParams.get('basePath'); // 可選的 basePath 參數
    
    // 使用專案感知的 FileService 與降級機制
    const result = await ProjectAwareFileService.getDirectoryContentsWithFallback(
      path, 
      page, 
      limit, 
      basePath || undefined
    );
    
    const response: DirectoryResponse = {
      success: true,
      data: {
        path,
        items: result.items,
        totalCount: result.totalCount,
        hasMore: result.hasMore,
        page,
        limit
      },
      // 如果有錯誤或使用了降級機制，包含在回應中
      error: result.error,
      fallbackUsed: result.fallbackUsed
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Directory API error occurred');
    
    const errorResponse: ApiError = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred while accessing directory'
    };
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}