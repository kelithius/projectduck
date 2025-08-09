import { NextRequest, NextResponse } from 'next/server';
import { FileService } from '@/lib/services/fileService';
import { ApiError } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.get('path');
    
    if (!path) {
      const errorResponse: ApiError = { 
        success: false, 
        error: 'Path parameter is required' 
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }
    
    const fileStream = await FileService.getFileStream(path);
    const info = await FileService.getFileInfo(path);
    
    // 將 ReadStream 轉換為 Response
    const response = new NextResponse(fileStream as unknown as ReadableStream);
    response.headers.set('Content-Type', info.type);
    response.headers.set('Content-Length', info.size.toString());
    
    return response;
  } catch (error) {
    const errorResponse: ApiError = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    
    return NextResponse.json(errorResponse, { status: 400 });
  }
}