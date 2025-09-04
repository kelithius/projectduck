import { NextRequest } from 'next/server';
import { claudeSDKService } from '@/lib/services/claude/claudeSDKService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectPath = searchParams.get('projectPath');

    if (!projectPath?.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Project path is required' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // 從 Claude SDK 獲取對話歷史
    const messages = claudeSDKService.getMessageHistory(projectPath);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        messages 
      }),
      { 
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('History API error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load conversation history'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}