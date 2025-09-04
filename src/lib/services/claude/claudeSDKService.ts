import { query, type Query, type SDKMessage, type Options, type PermissionMode, type SDKUserMessage } from '@anthropic-ai/claude-code';
import { ClaudeSession } from './claudeSession';
import { sessionManager } from './sessionManager';
import { Message, FileAttachment } from '@/lib/types/chat';
import { v4 as uuidv4 } from 'uuid';

export interface StartQueryOptions {
  prompt: string;
  projectPath: string;
  attachments?: File[];
  permissionMode?: PermissionMode;
  allowedTools?: string[];
  maxTurns?: number;
}

export interface QueryResult {
  success: boolean;
  sessionId: string;
  error?: string;
}

export class ClaudeSDKService {
  private static instance: ClaudeSDKService;

  public static getInstance(): ClaudeSDKService {
    if (!ClaudeSDKService.instance) {
      ClaudeSDKService.instance = new ClaudeSDKService();
    }
    return ClaudeSDKService.instance;
  }

  private constructor() {}

  public async startQuery(options: StartQueryOptions): Promise<QueryResult> {
    const { prompt, projectPath, attachments, permissionMode = 'default', allowedTools, maxTurns } = options;

    try {
      // 取得或建立 session
      const session = sessionManager.switchSession(projectPath);
      
      // 處理附件
      let processedAttachments: FileAttachment[] = [];
      if (attachments && attachments.length > 0) {
        processedAttachments = await session.processAttachments(attachments);
      }

      // 建立使用者訊息
      const userMessage = session.addUserMessage(prompt, processedAttachments);

      console.log('[ClaudeSDK] Starting query with options:', {
        cwd: projectPath,
        permissionMode,
        allowedTools: allowedTools || ['Read', 'Write', 'Edit', 'Bash'],
        maxTurns: maxTurns || 50,
        continue: true
      });
      
      const sdkOptions: Options = {
        cwd: projectPath,
        permissionMode,
        allowedTools: allowedTools || ['Read', 'Write', 'Edit', 'Bash'],
        maxTurns: maxTurns || 50,
        continue: true, // 啟用對話連續性
        abortController: new AbortController(),
        hooks: {
          UserPromptSubmit: [{
            hooks: [async (input, toolUseID, options) => {
              console.log('User prompt submitted:', input);
              return { continue: true };
            }]
          }],
          SessionStart: [{
            hooks: [async (input, toolUseID, options) => {
              console.log('Session started:', input);
              return { continue: true };
            }]
          }],
          SessionEnd: [{
            hooks: [async (input, toolUseID, options) => {
              console.log('Session ended:', input);
              session.clearCurrentQuery();
              return { continue: true };
            }]
          }],
          PreToolUse: [{
            hooks: [async (input, toolUseID, options) => {
              console.log('Pre tool use:', input.tool_name);
              return { 
                continue: true,
                hookSpecificOutput: {
                  hookEventName: 'PreToolUse',
                  permissionDecision: 'allow'
                }
              };
            }]
          }],
          PostToolUse: [{
            hooks: [async (input, toolUseID, options) => {
              console.log('Post tool use:', input.tool_name);
              return { continue: true };
            }]
          }]
        }
      };

      // 設定 AbortController
      session.setAbortController(sdkOptions.abortController!);

      // 建立查詢
      const queryGenerator = query({
        prompt: this.buildPromptWithAttachments(prompt, processedAttachments),
        options: sdkOptions
      });

      // 設定當前查詢
      session.setCurrentQuery(queryGenerator);

      return {
        success: true,
        sessionId: session.getSessionId()
      };

    } catch (error) {
      console.error('Failed to start query:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Detailed error:', errorMessage);
      return {
        success: false,
        sessionId: '',
        error: errorMessage
      };
    }
  }

  public async* processQuery(sessionId: string): AsyncGenerator<SDKMessage, void, unknown> {
    // 透過 sessionId 找到對應的 session
    const allSessions = sessionManager.getAllSessions();
    const sessionInfo = allSessions.find(s => s.session.getSessionId() === sessionId);
    
    if (!sessionInfo) {
      throw new Error('Session not found');
    }

    const session = sessionInfo.session;
    const queryGenerator = session['currentQuery'] as Query | null;
    
    if (!queryGenerator) {
      throw new Error('No active query found');
    }

    try {
      for await (const message of queryGenerator) {
        // 儲存 SDK 訊息到 session
        session.addSdkMessage(message);
        
        // 簡單記錄訊息類型（保留用於除錯）
        console.log('[ClaudeSDK] SDK Message type:', message.type);
        
        // 轉換並加入到 UI 訊息歷史
        const uiMessage = session.convertSdkMessageToUiMessage(message);
        if (uiMessage && uiMessage.role === 'assistant') {
          session.addAssistantMessage(uiMessage.content);
        }
        
        yield message;
      }
    } catch (error) {
      console.error('Error in query processing:', error);
      throw error;
    } finally {
      session.clearCurrentQuery();
    }
  }

  public async interruptQuery(projectPath: string): Promise<boolean> {
    try {
      const session = sessionManager.getSession(projectPath);
      if (session) {
        await session.interrupt();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to interrupt query:', error);
      return false;
    }
  }

  public async setPermissionMode(projectPath: string, mode: PermissionMode): Promise<boolean> {
    try {
      const session = sessionManager.getSession(projectPath);
      if (session) {
        await session.setPermissionMode(mode);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to set permission mode:', error);
      return false;
    }
  }

  public getSession(projectPath: string): ClaudeSession | null {
    return sessionManager.getSession(projectPath);
  }

  public getAllSessions(): Array<{ projectPath: string; session: ClaudeSession }> {
    return sessionManager.getAllSessions();
  }

  public async clearSession(projectPath: string): Promise<boolean> {
    try {
      console.log('[ClaudeSDK] Clearing session for project:', projectPath);
      await sessionManager.clearSession(projectPath);
      return true;
    } catch (error) {
      console.error('Failed to clear session:', error);
      return false;
    }
  }

  public async removeSession(projectPath: string): Promise<boolean> {
    try {
      await sessionManager.removeSession(projectPath);
      return true;
    } catch (error) {
      console.error('Failed to remove session:', error);
      return false;
    }
  }

  public isSessionActive(projectPath: string): boolean {
    const session = sessionManager.getSession(projectPath);
    return session ? session.isSessionActive() : false;
  }

  public getMessageHistory(projectPath: string): Message[] {
    const session = sessionManager.getSession(projectPath);
    return session ? session.getMessageHistory() : [];
  }

  // 建構包含附件的提示詞
  private buildPromptWithAttachments(prompt: string, attachments: FileAttachment[]): string {
    if (!attachments.length) {
      return prompt;
    }

    let enhancedPrompt = prompt;
    
    // 添加附件資訊
    const attachmentInfo = attachments.map(att => {
      let info = `File: ${att.name} (${att.type}, ${this.formatFileSize(att.size)})`;
      if (att.content) {
        info += `\nContent:\n${att.content}`;
      }
      return info;
    }).join('\n\n');

    enhancedPrompt += '\n\n--- Attached Files ---\n' + attachmentInfo;

    return enhancedPrompt;
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }

  // 檢查 Claude CLI 是否可用
  public async checkClaudeAvailability(): Promise<{ available: boolean; error?: string }> {
    try {
      // 建立一個測試查詢但不執行，只檢查是否能正常建立
      const testOptions: Options = {
        cwd: process.cwd(),
        maxTurns: 1,
        abortController: new AbortController()
      };

      // 嘗試建立查詢來測試 SDK 可用性
      const testQuery = query({
        prompt: 'Hello',
        options: testOptions
      });

      // 立即中斷以避免實際執行
      testOptions.abortController.abort();
      
      return { available: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // 檢查是否為認證相關錯誤
      if (errorMessage.includes('authenticate') || errorMessage.includes('login') || errorMessage.includes('auth')) {
        return {
          available: false,
          error: 'Authentication required. Please run: claude login'
        };
      }
      
      return {
        available: false,
        error: errorMessage
      };
    }
  }

  // 取得支援的工具列表
  public getSupportedTools(): string[] {
    return [
      'Read',
      'Write',
      'Edit',
      'Bash',
      'Search',
      'Replace',
      'Create',
      'Delete',
      'Move',
      'Copy'
    ];
  }

  // 取得支援的權限模式
  public getSupportedPermissionModes(): PermissionMode[] {
    return ['default', 'acceptEdits', 'bypassPermissions', 'plan'];
  }

  // 統計資訊
  public getStats() {
    const allSessions = sessionManager.getAllSessions();
    
    return {
      totalSessions: allSessions.length,
      activeSessions: allSessions.filter(s => s.session.isSessionActive()).length,
      totalMessages: sessionManager.getTotalMessageCount(),
      sessionsByProject: allSessions.map(s => ({
        projectPath: s.projectPath,
        messageCount: s.session.getMessageHistory().length,
        isActive: s.session.isSessionActive()
      }))
    };
  }
}

// 匯出單例實例
export const claudeSDKService = ClaudeSDKService.getInstance();