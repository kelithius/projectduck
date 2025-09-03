import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { v4 as uuidv4 } from 'uuid';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  let tempFiles: string[] = [];
  
  try {
    const formData = await request.formData();
    const message = formData.get('message') as string;
    const projectPath = formData.get('projectPath') as string;
    const attachmentCount = parseInt(formData.get('attachmentCount') as string || '0');

    if (!message?.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Message is required'
      }, { status: 400 });
    }

    // 準備 Claude CLI 命令
    let claudeCommand = 'claude';
    let promptText = message;

    // 如果有專案路徑，切換到該目錄
    if (projectPath) {
      claudeCommand = `cd "${projectPath}" && claude`;
    }

    // 處理附件
    const attachmentPaths: string[] = [];
    if (attachmentCount > 0) {
      const tempDir = join(tmpdir(), 'claude-chat-' + uuidv4());
      await mkdir(tempDir, { recursive: true });

      for (let i = 0; i < attachmentCount; i++) {
        const file = formData.get(`attachment_${i}`) as File;
        if (file) {
          const buffer = await file.arrayBuffer();
          const tempPath = join(tempDir, file.name);
          await writeFile(tempPath, Buffer.from(buffer));
          attachmentPaths.push(tempPath);
          tempFiles.push(tempPath);
        }
      }

      // 如果有附件，將路徑添加到提示中
      if (attachmentPaths.length > 0) {
        promptText = `${message}\n\nAttached files: ${attachmentPaths.join(', ')}`;
      }
    }

    // 目前先返回模擬回應，因為實際整合 Claude CLI 需要更複雜的設定
    // TODO: 實際整合 Claude Code CLI
    const simulatedResponse = `收到您的訊息：${message}

這是一個模擬的 Claude Code 回應。實際整合需要：
1. 正確設定 Claude CLI 認證
2. 處理命令執行和回應串流
3. 管理工作目錄和專案上下文

${attachmentPaths.length > 0 ? `附件 (${attachmentPaths.length} 個檔案): ${attachmentPaths.map(p => p.split('/').pop()).join(', ')}` : ''}

目前工作目錄: ${projectPath || '未設定'}`;

    // 清理臨時檔案
    for (const tempFile of tempFiles) {
      try {
        await unlink(tempFile);
      } catch (error) {
        console.warn('Failed to clean up temp file:', tempFile, error);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        message: simulatedResponse,
        projectPath: projectPath || null,
        attachmentCount: attachmentPaths.length
      }
    });

  } catch (error) {
    // 清理臨時檔案
    for (const tempFile of tempFiles) {
      try {
        await unlink(tempFile);
      } catch (cleanupError) {
        console.warn('Failed to clean up temp file:', tempFile, cleanupError);
      }
    }

    console.error('Chat API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

// 未來可以實作串流回應的版本
async function executeClaudeCommand(command: string, projectPath?: string): Promise<string> {
  try {
    const options = projectPath ? { cwd: projectPath } : {};
    const { stdout, stderr } = await execAsync(command, {
      ...options,
      timeout: 30000, // 30 秒超時
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });

    if (stderr) {
      console.warn('Claude CLI stderr:', stderr);
    }

    return stdout;
  } catch (error) {
    console.error('Claude CLI execution error:', error);
    throw new Error('Failed to execute Claude command');
  }
}