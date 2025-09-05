import { NextRequest } from 'next/server';
import { claudeSDKService } from '@/lib/services/claude/claudeSDKService';

// GET: 取得系統狀態和統計資訊
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientSessionId = searchParams.get('clientSessionId');

    // 取得 Claude Code 可用性
    const availability = await claudeSDKService.checkClaudeAvailability();
    
    // 取得統計資訊
    const stats = claudeSDKService.getStats();

    const response = {
      success: true,
      data: {
        architecture: 'simplified',
        claudeAvailable: availability.available,
        claudeError: availability.error,
        clientSessionId: clientSessionId || null,
        sessionModel: 'tab-isolated', // 每個分頁獨立
        stats: {
          runningQueries: stats.runningQueries,
          queryIds: stats.queryIds
        },
        features: {
          sessionPersistence: false, // 不持久化
          sessionResume: true, // 使用 Claude SDK resume
          sessionIsolation: true, // 完全隔離
          autoCleanup: false // 不需要清理
        }
      }
    };

    return new Response(
      JSON.stringify(response),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Status API] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get status'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// POST: 初始化或驗證 client session（可選）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientSessionId } = body;

    if (!clientSessionId?.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Client session ID is required' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('[Status API] Client session initialized:', clientSessionId);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          clientSessionId,
          message: 'Session registered (no server-side state maintained)',
          architecture: 'simplified'
        }
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Status API] Initialization error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initialize session'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}