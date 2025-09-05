import { NextRequest } from 'next/server';
import { claudeSDKService } from '@/lib/services/claude/claudeSDKService';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectPath = searchParams.get('projectPath');
    const browserSessionId = searchParams.get('browserSessionId');

    if (!projectPath?.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Project path is required' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // 使用 Claude SDK 清除 session，傳入 browserSessionId
    const success = await claudeSDKService.clearSession(projectPath, browserSessionId || undefined);
    
    return new Response(
      JSON.stringify({ 
        success,
        message: success ? 'Session cleared successfully' : 'Failed to clear session'
      }),
      { 
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Clear session API error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clear session'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}