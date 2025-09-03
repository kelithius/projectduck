import { NextRequest, NextResponse } from 'next/server';

// 簡單的記憶體儲存，實際專案中可能需要更持久的儲存方案
let currentProjectPath: string | null = null;

export async function GET() {
  return NextResponse.json({
    currentProject: currentProjectPath
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectPath } = body;

    if (!projectPath) {
      return NextResponse.json({
        success: false,
        error: 'Project path is required'
      }, { status: 400 });
    }

    // 驗證路徑格式
    if (typeof projectPath !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Invalid project path format'
      }, { status: 400 });
    }

    // 更新當前專案路徑
    currentProjectPath = projectPath;

    return NextResponse.json({
      success: true,
      projectPath: currentProjectPath
    });
  } catch (error) {
    console.error('Project setting error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to set project path'
    }, { status: 500 });
  }
}