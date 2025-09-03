import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
  try {
    // 檢查 claude CLI 是否已安裝並認證
    const { stdout, stderr } = await execAsync('claude --version');
    
    if (stderr && stderr.includes('not found')) {
      return NextResponse.json({
        authenticated: false,
        error: 'Claude CLI not installed'
      });
    }

    // 嘗試執行一個簡單的 claude 命令來檢查認證狀態
    try {
      await execAsync('claude --help', { timeout: 5000 });
      return NextResponse.json({
        authenticated: true,
        version: stdout.trim()
      });
    } catch (error) {
      return NextResponse.json({
        authenticated: false,
        error: 'Authentication required'
      });
    }
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({
      authenticated: false,
      error: 'Failed to check authentication'
    });
  }
}

export async function POST() {
  try {
    // 注意：實際上 claude login 需要互動式終端
    // 這裡我們返回指引訊息，讓使用者手動執行
    return NextResponse.json({
      success: false,
      error: 'Please run "claude login" in your terminal to authenticate',
      instructions: [
        '1. Open your terminal',
        '2. Run: claude login',
        '3. Follow the authentication process',
        '4. Refresh this page'
      ]
    });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({
      success: false,
      error: 'Authentication failed'
    });
  }
}