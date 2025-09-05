import { query, type Query, type SDKMessage, type Options, type PermissionMode } from '@anthropic-ai/claude-code';
import { ClaudeSession } from './claudeSession';
import { sessionManager } from './sessionManager';
import { FileAttachment } from '@/lib/types/chat';
import { execSync } from 'child_process';

export interface StartQueryOptions {
  prompt: string;
  projectPath: string;
  browserSessionId?: string;
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
    const { prompt, projectPath, browserSessionId, attachments, permissionMode = 'default', allowedTools, maxTurns } = options;

    try {
      // 取得或建立 session，加入瀏覽器 session ID 來區隔不同視窗
      const session = sessionManager.switchSession(projectPath, browserSessionId);
      
      // 處理附件
      let processedAttachments: FileAttachment[] = [];
      if (attachments && attachments.length > 0) {
        processedAttachments = await session.processAttachments(attachments);
      }

      // 建立使用者訊息
      session.addUserMessage(prompt, processedAttachments);

      console.log('[ClaudeSDK] Starting query with options:', {
        sessionId: session.getSessionId(),
        browserSessionId: browserSessionId || 'none',
        cwd: projectPath,
        permissionMode,
        allowedTools: allowedTools || ['Read', 'Write', 'Edit', 'Bash'],
        maxTurns: maxTurns || 50,
        messageHistoryLength: session.getMessageHistory().length
      });
      
      const sdkOptions: Options = {
        cwd: projectPath,
        permissionMode,
        allowedTools: allowedTools || ['Read', 'Write', 'Edit', 'Bash'],
        maxTurns: maxTurns || 50,
        // 不使用 continue，每個查詢都是獨立的
        // 如果需要上下文，應該通過 prompt 中包含相關信息來處理
        abortController: new AbortController(),
        // 動態設定 Claude executable 路徑
        ...(() => {
          try {
            const claudePath = execSync('which claude', { encoding: 'utf8' }).trim();
            return { pathToClaudeCodeExecutable: claudePath };
          } catch {
            if (process.env.CLAUDE_CODE_EXECUTABLE_PATH) {
              return { pathToClaudeCodeExecutable: process.env.CLAUDE_CODE_EXECUTABLE_PATH };
            }
            return {};
          }
        })(),
        hooks: {
          UserPromptSubmit: [{
            hooks: [async (input) => {
              console.log('User prompt submitted:', input);
              return { continue: true };
            }]
          }],
          SessionStart: [{
            hooks: [async (input) => {
              console.log('Session started:', input);
              return { continue: true };
            }]
          }],
          SessionEnd: [{
            hooks: [async (input) => {
              console.log('Session ended:', input);
              session.clearCurrentQuery();
              return { continue: true };
            }]
          }],
          PreToolUse: [{
            hooks: [async (input) => {
              console.log('Pre tool use:', (input as { tool_name?: string }).tool_name);
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
            hooks: [async (input) => {
              console.log('Post tool use:', (input as { tool_name?: string }).tool_name);
              return { continue: true };
            }]
          }]
        }
      };

      // 設定 AbortController
      session.setAbortController(sdkOptions.abortController!);

      // 建立查詢，包含對話歷史作為上下文
      const queryGenerator = query({
        prompt: this.buildPromptWithContext(prompt, processedAttachments, session),
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

  public async interruptQuery(projectPath: string, browserSessionId?: string): Promise<boolean> {
    try {
      const session = sessionManager.getSession(projectPath, browserSessionId);
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

  public async setPermissionMode(projectPath: string, mode: PermissionMode, browserSessionId?: string): Promise<boolean> {
    try {
      const session = sessionManager.getSession(projectPath, browserSessionId);
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

  public getSession(projectPath: string, browserSessionId?: string): ClaudeSession | null {
    return sessionManager.getSession(projectPath, browserSessionId);
  }

  public getAllSessions(): Array<{ projectPath: string; session: ClaudeSession }> {
    return sessionManager.getAllSessions();
  }

  public async clearSession(projectPath: string, browserSessionId?: string): Promise<boolean> {
    try {
      console.log('[ClaudeSDK] Clearing session for project:', projectPath, browserSessionId ? `browser session: ${browserSessionId}` : '');
      await sessionManager.clearSession(projectPath, browserSessionId);
      return true;
    } catch (error) {
      console.error('Failed to clear session:', error);
      return false;
    }
  }

  public async removeSession(projectPath: string, browserSessionId?: string): Promise<boolean> {
    try {
      await sessionManager.removeSession(projectPath, browserSessionId);
      return true;
    } catch (error) {
      console.error('Failed to remove session:', error);
      return false;
    }
  }

  public isSessionActive(projectPath: string, browserSessionId?: string): boolean {
    const session = sessionManager.getSession(projectPath, browserSessionId);
    return session ? session.isSessionActive() : false;
  }


  // 建構包含附件和對話歷史的提示詞
  private buildPromptWithContext(prompt: string, attachments: FileAttachment[], session: ClaudeSession): string {
    let enhancedPrompt = '';
    
    // 添加對話歷史作為上下文（但不包括當前用戶訊息）
    const messageHistory = session.getMessageHistory();
    if (messageHistory.length > 1) { // 排除當前刚添加的用戶訊息
      enhancedPrompt += '--- Previous Conversation Context ---\n';
      // 只包含前面的對話，不包括最後一條（當前訊息）
      const previousMessages = messageHistory.slice(0, -1);
      previousMessages.forEach(msg => {
        enhancedPrompt += `${msg.role.toUpperCase()}: ${msg.content}\n\n`;
      });
      enhancedPrompt += '--- End of Previous Context ---\n\n';
    }
    
    // 添加當前用戶訊息
    enhancedPrompt += prompt;
    
    // 添加附件資訊
    if (attachments.length > 0) {
      const attachmentInfo = attachments.map(att => {
        let info = `File: ${att.name} (${att.type}, ${this.formatFileSize(att.size)})`;
        if (att.content) {
          info += `\nContent:\n${att.content}`;
        }
        return info;
      }).join('\n\n');

      enhancedPrompt += '\n\n--- Attached Files ---\n' + attachmentInfo;
    }

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
    const isVertexMode = process.env.CLAUDE_CODE_USE_VERTEX === '1';
    const vertexProjectId = process.env.ANTHROPIC_VERTEX_PROJECT_ID;
    const hasGoogleCreds = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;
    
    console.log('[ClaudeSDK] Authentication mode check:');
    console.log(`[ClaudeSDK]   - Vertex AI mode: ${isVertexMode ? 'ENABLED' : 'DISABLED'}`);
    if (isVertexMode) {
      console.log(`[ClaudeSDK]   - Project ID: ${vertexProjectId ? vertexProjectId : 'NOT SET'}`);
      console.log(`[ClaudeSDK]   - Google credentials: ${hasGoogleCreds ? 'SET' : 'NOT SET'}`);
      console.log(`[ClaudeSDK]   - Credentials path: ${process.env.GOOGLE_APPLICATION_CREDENTIALS || 'NOT SET'}`);
    }
    
    try {
      // 建立一個測試查詢但不執行，只檢查是否能正常建立
      const testOptions: Options = {
        cwd: process.cwd(),
        maxTurns: 1,
        abortController: new AbortController()
      };
      
      // 自動找到 Claude Code 可執行文件路徑
      try {
        const claudePath = execSync('which claude', { encoding: 'utf8' }).trim();
        console.log(`[ClaudeSDK]   - Claude executable found at: ${claudePath}`);
        testOptions.pathToClaudeCodeExecutable = claudePath;
      } catch {
        console.log(`[ClaudeSDK]   - Could not find claude executable with 'which' command`);
        // 如果設定了自定義的 Claude Code 可執行文件路徑，則使用它
        if (process.env.CLAUDE_CODE_EXECUTABLE_PATH) {
          console.log(`[ClaudeSDK]   - Using custom executable path: ${process.env.CLAUDE_CODE_EXECUTABLE_PATH}`);
          testOptions.pathToClaudeCodeExecutable = process.env.CLAUDE_CODE_EXECUTABLE_PATH;
        }
      }

      // 嘗試建立查詢來測試 SDK 可用性
      query({
        prompt: 'Hello',
        options: testOptions
      });

      // 立即中斷以避免實際執行
      testOptions.abortController?.abort();
      
      console.log(`[ClaudeSDK] ✅ Authentication successful - ${isVertexMode ? 'Vertex AI' : 'Standard'} mode`);
      return { available: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // 檢查是否為認證相關錯誤
      if (errorMessage.includes('authenticate') || errorMessage.includes('login') || errorMessage.includes('auth')) {
        // 檢查是否使用 Vertex AI
        if (isVertexMode) {
          console.log(`[ClaudeSDK] ❌ Vertex AI authentication failed`);
          console.log(`[ClaudeSDK]   - Error: ${errorMessage}`);
          console.log(`[ClaudeSDK]   - Please check your Vertex AI configuration`);
          return {
            available: false,
            error: 'Vertex AI authentication required. Please ensure GOOGLE_APPLICATION_CREDENTIALS and ANTHROPIC_VERTEX_PROJECT_ID are set correctly.'
          };
        } else {
          console.log(`[ClaudeSDK] ❌ Standard authentication failed`);
          console.log(`[ClaudeSDK]   - Error: ${errorMessage}`);
          console.log(`[ClaudeSDK]   - Please run: claude login`);
          return {
            available: false,
            error: 'Authentication required. Please run: claude login'
          };
        }
      }
      
      console.log(`[ClaudeSDK] ⚠️  Authentication check failed with non-auth error`);
      console.log(`[ClaudeSDK]   - Mode: ${isVertexMode ? 'Vertex AI' : 'Standard'}`);
      console.log(`[ClaudeSDK]   - Error: ${errorMessage}`);
      
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