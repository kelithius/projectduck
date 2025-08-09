import { NextRequest, NextResponse } from 'next/server';
import { FileService } from '@/lib/services/fileService';
import { FileInfoResponse, ApiError } from '@/lib/types';

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
    
    const info = await FileService.getFileInfo(path);
    
    const response: FileInfoResponse = {
      success: true,
      data: info
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