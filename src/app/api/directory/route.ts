import { NextRequest, NextResponse } from 'next/server';
import { FileService } from '@/lib/services/fileService';
import { DirectoryResponse, ApiError } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.get('path') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const result = await FileService.getDirectoryContents(path, page, limit);
    
    const response: DirectoryResponse = {
      success: true,
      data: {
        path,
        items: result.items,
        totalCount: result.totalCount,
        hasMore: result.hasMore,
        page,
        limit
      }
    };
    
    return NextResponse.json(response);
  } catch (error) {
    const errorResponse: ApiError = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    
    return NextResponse.json(errorResponse, { status: 400 });
  }
}