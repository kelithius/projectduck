import { NextRequest } from 'next/server';

// 這個 API 已棄用，請使用新的 /api/claude/status
export async function GET(request: NextRequest) {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'This API is deprecated. Please use /api/claude/status instead.',
      migration: {
        oldEndpoint: '/api/claude/session',
        newEndpoint: '/api/claude/status',
        architecture: 'simplified',
        reason: 'Session management is now handled by Claude Code SDK directly'
      }
    }),
    { 
      status: 410, // Gone
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

export async function POST(request: NextRequest) {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'This API is deprecated. Sessions are now automatically managed.',
      migration: {
        oldEndpoint: 'POST /api/claude/session',
        newBehavior: 'Sessions are created automatically with each clientSessionId',
        architecture: 'simplified'
      }
    }),
    { 
      status: 410, // Gone
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

export async function DELETE(request: NextRequest) {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'This API is deprecated. Session cleanup is automatic.',
      migration: {
        oldEndpoint: 'DELETE /api/claude/session',
        newBehavior: 'Sessions are isolated per tab and cleaned up automatically',
        architecture: 'simplified'
      }
    }),
    { 
      status: 410, // Gone
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

export async function PATCH(request: NextRequest) {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'This API is deprecated. Session configuration is handled by Claude SDK.',
      migration: {
        oldEndpoint: 'PATCH /api/claude/session',
        newBehavior: 'Configuration is passed directly to Claude SDK in each query',
        architecture: 'simplified'
      }
    }),
    { 
      status: 410, // Gone
      headers: { 'Content-Type': 'application/json' }
    }
  );
}