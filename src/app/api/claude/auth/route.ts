import { NextRequest } from 'next/server';
import { claudeSDKService } from '@/lib/services/claude/claudeSDKService';

export async function GET() {
  try {
    const availability = await claudeSDKService.checkClaudeAvailability();
    
    return new Response(
      JSON.stringify({
        authenticated: availability.available,
        error: availability.error,
        supportedTools: claudeSDKService.getSupportedTools(),
        supportedPermissionModes: claudeSDKService.getSupportedPermissionModes(),
        stats: claudeSDKService.getStats()
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Auth check error:', error);
    return new Response(
      JSON.stringify({
        authenticated: false,
        error: error instanceof Error ? error.message : 'Failed to check authentication'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

export async function POST() {
  try {
    // Claude Code SDK 會自動處理認證，這裡主要是重新檢查狀態
    const availability = await claudeSDKService.checkClaudeAvailability();
    
    if (availability.available) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Claude Code is available and ready to use'
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Claude Code authentication required',
          instructions: [
            '1. Open your terminal',
            '2. Run: claude login',
            '3. Follow the authentication process',
            '4. Refresh this page',
            '5. Alternative: Set up API key in Claude Code settings'
          ]
        }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

  } catch (error) {
    console.error('Auth POST error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Authentication check failed'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}