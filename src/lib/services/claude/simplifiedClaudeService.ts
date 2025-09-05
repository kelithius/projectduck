import { query, type Query, type SDKMessage, type Options, type PermissionMode } from '@anthropic-ai/claude-code';
import { execSync } from 'child_process';
import { FileAttachment } from '@/lib/types/chat';

export interface SimplifiedQueryOptions {
  prompt: string;
  projectPath: string;
  clientSessionId?: string; // 用於 resume 的 session ID
  attachments?: File[];
  permissionMode?: PermissionMode;
  allowedTools?: string[];
  maxTurns?: number;
}

export interface QueryResult {
  success: boolean;
  queryGenerator?: Query;
  error?: string;
}

/**
 * 極簡化的 Claude Code SDK 服務
 * 
 * 設計理念：
 * 1. 不維護自己的 session 狀態
 * 2. 完全依賴 Claude Code SDK 的 resume 機制
 * 3. 每個分頁/重新整理都是新的開始
 * 4. 無狀態設計，伺服器不保存任何對話歷史
 */
export class SimplifiedClaudeService {
  private static instance: SimplifiedClaudeService;
  private runningQueries: Map<string, { query: Query; abortController: AbortController }> = new Map();

  public static getInstance(): SimplifiedClaudeService {
    if (!SimplifiedClaudeService.instance) {
      SimplifiedClaudeService.instance = new SimplifiedClaudeService();
    }
    return SimplifiedClaudeService.instance;
  }

  private constructor() {}

  /**
   * 啟動查詢 - 極簡版本
   */
  public async startQuery(options: SimplifiedQueryOptions): Promise<QueryResult> {
    const { 
      prompt, 
      projectPath, 
      clientSessionId,
      attachments, 
      permissionMode = 'default', 
      allowedTools = ['Read', 'Write', 'Edit', 'Bash'],
      maxTurns = 50
    } = options;

    try {
      console.log('[SimplifiedClaude] Starting query:', {
        clientSessionId: clientSessionId || 'new-session',
        projectPath,
        hasAttachments: !!attachments?.length,
        resumeMode: !!clientSessionId
      });

      // 建構 SDK 選項
      const sdkOptions: Options = {
        cwd: projectPath,
        permissionMode,
        allowedTools,
        maxTurns,
        // 如果有 clientSessionId，使用 resume 機制
        ...(clientSessionId ? { resumeSessionId: clientSessionId } : {}),
        abortController: new AbortController(),
        // 動態設定 Claude executable 路徑
        ...this.getClaudeExecutablePath()
      };

      // 處理附件並建構 prompt
      const enhancedPrompt = await this.buildPromptWithAttachments(prompt, attachments || []);

      // 建立查詢
      const queryGenerator = query({
        prompt: enhancedPrompt,
        options: sdkOptions
      });

      // 追蹤運行中的查詢（用於中斷）
      if (clientSessionId) {
        this.runningQueries.set(clientSessionId, {
          query: queryGenerator,
          abortController: sdkOptions.abortController!
        });
      }

      return {
        success: true,
        queryGenerator
      };

    } catch (error) {
      console.error('[SimplifiedClaude] Failed to start query:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 中斷指定的查詢
   */
  public async interruptQuery(clientSessionId: string): Promise<boolean> {
    const runningQuery = this.runningQueries.get(clientSessionId);
    if (runningQuery) {
      try {
        runningQuery.abortController.abort();
        this.runningQueries.delete(clientSessionId);
        console.log('[SimplifiedClaude] Query interrupted:', clientSessionId);
        return true;
      } catch (error) {
        console.error('[SimplifiedClaude] Failed to interrupt query:', error);
        return false;
      }
    }
    return false;
  }

  /**
   * 處理查詢結果流
   */
  public async* processQuery(queryGenerator: Query, clientSessionId?: string): AsyncGenerator<SDKMessage, void, unknown> {
    try {
      for await (const message of queryGenerator) {
        console.log('[SimplifiedClaude] SDK Message type:', message.type);
        yield message;
      }
    } catch (error) {
      console.error('[SimplifiedClaude] Error in query processing:', error);
      throw error;
    } finally {
      // 清理運行中的查詢追蹤
      if (clientSessionId) {
        this.runningQueries.delete(clientSessionId);
      }
    }
  }

  /**
   * 建構包含附件的 prompt
   */
  private async buildPromptWithAttachments(prompt: string, attachments: File[]): Promise<string> {
    if (attachments.length === 0) {
      return prompt;
    }

    let enhancedPrompt = prompt;
    
    // 處理附件
    const attachmentInfos: string[] = [];
    for (const file of attachments) {
      let info = `File: ${file.name} (${file.type}, ${this.formatFileSize(file.size)})`;
      
      // 如果是文字檔案，讀取內容
      if (this.isTextFile(file)) {
        try {
          const content = await file.text();
          info += `\nContent:\n${content}`;
        } catch (error) {
          console.warn(`[SimplifiedClaude] Failed to read file content: ${file.name}`, error);
        }
      }
      
      attachmentInfos.push(info);
    }

    enhancedPrompt += '\n\n--- Attached Files ---\n' + attachmentInfos.join('\n\n');
    return enhancedPrompt;
  }

  /**
   * 檢查是否為文字檔案
   */
  private isTextFile(file: File): boolean {
    return file.type.startsWith('text/') || 
           file.name.endsWith('.md') || 
           file.name.endsWith('.txt') || 
           file.name.endsWith('.json') ||
           file.name.endsWith('.js') ||
           file.name.endsWith('.ts') ||
           file.name.endsWith('.py') ||
           file.name.endsWith('.css') ||
           file.name.endsWith('.html');
  }

  /**
   * 格式化檔案大小
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }

  /**
   * 取得 Claude executable 路徑
   */
  private getClaudeExecutablePath(): Partial<Options> {
    try {
      const claudePath = execSync('which claude', { encoding: 'utf8' }).trim();
      console.log('[SimplifiedClaude] Claude executable found at:', claudePath);
      return { pathToClaudeCodeExecutable: claudePath };
    } catch {
      console.log('[SimplifiedClaude] Could not find claude executable with "which" command');
      if (process.env.CLAUDE_CODE_EXECUTABLE_PATH) {
        console.log('[SimplifiedClaude] Using custom executable path:', process.env.CLAUDE_CODE_EXECUTABLE_PATH);
        return { pathToClaudeCodeExecutable: process.env.CLAUDE_CODE_EXECUTABLE_PATH };
      }
      return {};
    }
  }

  /**
   * 檢查 Claude CLI 是否可用
   */
  public async checkClaudeAvailability(): Promise<{ available: boolean; error?: string }> {
    const isVertexMode = process.env.CLAUDE_CODE_USE_VERTEX === '1';
    const vertexProjectId = process.env.ANTHROPIC_VERTEX_PROJECT_ID;
    const hasGoogleCreds = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;
    
    console.log('[SimplifiedClaude] Authentication mode check:');
    console.log(`[SimplifiedClaude]   - Vertex AI mode: ${isVertexMode ? 'ENABLED' : 'DISABLED'}`);
    if (isVertexMode) {
      console.log(`[SimplifiedClaude]   - Project ID: ${vertexProjectId || 'NOT SET'}`);
      console.log(`[SimplifiedClaude]   - Google credentials: ${hasGoogleCreds ? 'SET' : 'NOT SET'}`);
    }
    
    try {
      // 建立測試查詢
      const testOptions: Options = {
        cwd: process.cwd(),
        maxTurns: 1,
        abortController: new AbortController(),
        ...this.getClaudeExecutablePath()
      };

      // 嘗試建立查詢來測試 SDK 可用性
      query({
        prompt: 'Hello',
        options: testOptions
      });

      // 立即中斷避免實際執行
      testOptions.abortController?.abort();
      
      console.log(`[SimplifiedClaude] ✅ Authentication successful - ${isVertexMode ? 'Vertex AI' : 'Standard'} mode`);
      return { available: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('authenticate') || errorMessage.includes('login') || errorMessage.includes('auth')) {
        if (isVertexMode) {
          console.log('[SimplifiedClaude] ❌ Vertex AI authentication failed');
          return {
            available: false,
            error: 'Vertex AI authentication required. Please ensure GOOGLE_APPLICATION_CREDENTIALS and ANTHROPIC_VERTEX_PROJECT_ID are set correctly.'
          };
        } else {
          console.log('[SimplifiedClaude] ❌ Standard authentication failed');
          return {
            available: false,
            error: 'Authentication required. Please run: claude login'
          };
        }
      }
      
      console.log('[SimplifiedClaude] ⚠️ Authentication check failed:', errorMessage);
      return {
        available: false,
        error: errorMessage
      };
    }
  }

  /**
   * 取得統計資訊
   */
  public getStats() {
    return {
      runningQueries: this.runningQueries.size,
      queryIds: Array.from(this.runningQueries.keys())
    };
  }
}

// 匯出單例實例
export const simplifiedClaudeService = SimplifiedClaudeService.getInstance();