import { NextRequest, NextResponse } from 'next/server';
import { FileService } from '@/lib/services/fileService';
import { FileContentResponse, ApiError } from '@/lib/types';

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
    
    const content = await FileService.getFileContent(path);
    
    const response: FileContentResponse = {
      success: true,
      data: content
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