import { NextRequest } from 'next/server';
import { claudeSDKService } from '@/lib/services/claude/claudeSDKService';

// GET: 取得 session 資訊
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectPath = searchParams.get('projectPath');
    const browserSessionId = searchParams.get('browserSessionId');

    if (projectPath) {
      // 取得特定專案的 session 資訊
      const session = claudeSDKService.getSession(projectPath, browserSessionId || undefined);
      
      if (!session) {
        return new Response(
          JSON.stringify({ success: false, error: 'Session not found' }),
          { 
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            sessionId: session.getSessionId(),
            projectPath: session.getProjectPath(),
            isActive: session.isSessionActive(),
            messageCount: session.getMessageHistory().length,
            messages: session.getMessageHistory()
          }
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      // 取得所有 sessions 資訊
      const stats = claudeSDKService.getStats();
      const sessions = claudeSDKService.getAllSessions();

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            stats,
            sessions: sessions.map(s => ({
              sessionId: s.session.getSessionId(),
              projectPath: s.projectPath,
              isActive: s.session.isSessionActive(),
              messageCount: s.session.getMessageHistory().length
            }))
          }
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Session GET API error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get session info'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// POST: 建立或切換 session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectPath, browserSessionId } = body;

    if (!projectPath?.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Project path is required' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    let session = claudeSDKService.getSession(projectPath, browserSessionId);
    
    if (!session) {
      // 通過 sessionManager 建立新的 session
      const { sessionManager } = await import('@/lib/services/claude/sessionManager');
      session = sessionManager.switchSession(projectPath, browserSessionId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          sessionId: session.getSessionId(),
          projectPath: session.getProjectPath(),
          isActive: session.isSessionActive(),
          messageCount: session.getMessageHistory().length
        }
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Session POST API error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create session'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// DELETE: 清空或刪除 session
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectPath = searchParams.get('projectPath');
    const browserSessionId = searchParams.get('browserSessionId');
    const action = searchParams.get('action') || 'clear'; // 'clear' or 'remove'

    if (!projectPath) {
      return new Response(
        JSON.stringify({ success: false, error: 'Project path is required' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    let success = false;
    let message = '';

    if (action === 'remove') {
      success = await claudeSDKService.removeSession(projectPath, browserSessionId || undefined);
      message = success ? 'Session removed successfully' : 'Failed to remove session';
    } else {
      success = await claudeSDKService.clearSession(projectPath, browserSessionId || undefined);
      message = success ? 'Session cleared successfully' : 'Failed to clear session';
    }

    return new Response(
      JSON.stringify({ success, message }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Session DELETE API error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete session'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// PATCH: 更新 session 設定
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectPath, browserSessionId, permissionMode, options } = body;

    if (!projectPath?.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Project path is required' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const session = claudeSDKService.getSession(projectPath, browserSessionId);
    if (!session) {
      return new Response(
        JSON.stringify({ success: false, error: 'Session not found' }),
        { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // 更新權限模式
    if (permissionMode) {
      const success = await claudeSDKService.setPermissionMode(projectPath, permissionMode, browserSessionId);
      if (!success) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to set permission mode' }),
          { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // 更新其他選項
    if (options) {
      session.updateOptions(options);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          sessionId: session.getSessionId(),
          projectPath: session.getProjectPath(),
          isActive: session.isSessionActive(),
          options: session.getOptions()
        }
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Session PATCH API error:', error);
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