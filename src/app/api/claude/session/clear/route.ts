import { NextRequest } from 'next/server';

// 在新的極簡架構中，不需要清除 session
// 每個分頁/重新整理都會自動創建新的 session
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectPath = searchParams.get('projectPath');
    const clientSessionId = searchParams.get('clientSessionId');

    console.log('[Clear Session API] Called with simplified architecture');
    console.log('[Clear Session API] Project:', projectPath);
    console.log('[Clear Session API] Client Session ID:', clientSessionId);
    console.log('[Clear Session API] No action needed - sessions are automatically isolated');
    
    // 在新架構中，每個分頁都是獨立的，不需要清除
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Session isolation is automatic in new architecture'
      }),
      { 
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[Clear Session API] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process request'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}