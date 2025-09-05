import { NextRequest } from 'next/server';

// 簡化的 session API - 重定向到新的狀態 API
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clientSessionId = searchParams.get('clientSessionId') || searchParams.get('browserSessionId'); // 向後相容
  
  // 重定向到新的狀態 API
  const statusUrl = new URL('/api/claude/status', request.url);
  if (clientSessionId) {
    statusUrl.searchParams.set('clientSessionId', clientSessionId);
  }
  
  console.log('[Session API] Redirecting to status API:', statusUrl.pathname);
  
  return Response.redirect(statusUrl.toString(), 302);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectPath, clientSessionId, browserSessionId } = body;
    
    // 向後相容：支援 browserSessionId
    const sessionId = clientSessionId || browserSessionId;
    
    console.log('[Session API] Session creation requested (simplified architecture)');
    console.log('[Session API] Project:', projectPath);
    console.log('[Session API] Session ID:', sessionId);
    
    // 在新架構中，session 是自動創建的，不需要手動創建
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          sessionId: sessionId || 'auto-generated',
          projectPath,
          isActive: true,
          messageCount: 0,
          architecture: 'simplified',
          note: 'Sessions are now automatically managed by Claude Code SDK'
        }
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Session API] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

export async function DELETE(request: NextRequest) {
  // 重定向到清除 API
  const url = new URL(request.url);
  const clearUrl = new URL('/api/claude/session/clear', url.origin);
  clearUrl.search = url.search; // 保持查詢參數
  
  console.log('[Session API] Redirecting delete to clear API');
  
  return Response.redirect(clearUrl.toString(), 302);
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectPath, clientSessionId, browserSessionId, permissionMode, options } = body;
    
    // 向後相容：支援 browserSessionId  
    const sessionId = clientSessionId || browserSessionId;
    
    console.log('[Session API] Session update requested (simplified architecture)');
    console.log('[Session API] Session ID:', sessionId);
    console.log('[Session API] Permission mode:', permissionMode);
    
    // 在新架構中，選項會在每次查詢時直接傳遞給 SDK
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          sessionId: sessionId || 'auto-managed',
          projectPath,
          isActive: true,
          options: options || {},
          architecture: 'simplified',
          note: 'Options are now passed directly to Claude SDK in each query'
        }
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Session API] Update error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update session'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}