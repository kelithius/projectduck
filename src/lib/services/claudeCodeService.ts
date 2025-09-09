import { v4 as uuidv4 } from 'uuid';
import { Message, SendMessageOptions, FileAttachment } from '@/lib/types/chat';
import { appConfig } from '@/lib/services/appConfigService';

export interface ClaudeCodeResponse {
  success: boolean;
  data?: {
    message?: string;
    stream?: ReadableStream<Uint8Array>;
  };
  error?: string;
}

// 事件類型定義
export interface StreamEvent {
  type: 'start' | 'message' | 'complete' | 'error' | 'session';
  data: unknown;
}

class ClaudeCodeService {
  private authenticated: boolean = false;
  private abortController: AbortController | null = null;

  constructor() {
    console.log('[ClaudeCodeService] Initialized with new Claude-managed session architecture');
  }



  // 新的極簡架構下，不需要清除 session，因為每個分頁都是獨立的
  async clearSession(projectPath: string): Promise<boolean> {
    console.log('[ClaudeCodeService] Clear session called, but not needed in new architecture');
    console.log('[ClaudeCodeService] Each tab/reload creates a new independent session');
    return true; // 總是成功，因為不需要做任何事
  }

  async checkAuthentication(): Promise<boolean> {
    try {
      const response = await fetch('/api/claude/auth', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const result = await response.json();
      this.authenticated = result.authenticated || false;
      return this.authenticated;
    } catch (error) {
      console.error('[ClaudeCodeService] Authentication check failed:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
      this.authenticated = false;
      return false;
    }
  }

  async authenticate(): Promise<boolean> {
    try {
      const response = await fetch('/api/claude/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const result = await response.json();
      this.authenticated = result.success || false;
      return this.authenticated;
    } catch (error) {
      console.error('Authentication failed:', error);
      this.authenticated = false;
      return false;
    }
  }

  // 在新架構中，projectPath 直接在每次請求中傳遞，不需要全域狀態
  // async setWorkingDirectory 已經不需要了

  async sendMessage(options: SendMessageOptions, claudeSessionId?: string | null): Promise<ClaudeCodeResponse> {
    const { content, attachments, projectPath } = options;

    try {
      // 準備請求資料 - 使用新的極簡 API
      const formData = new FormData();
      formData.append('message', content);
      if (claudeSessionId) {
        formData.append('clientSessionId', claudeSessionId); // 向後相容：API 還期待 clientSessionId
      }
      
      if (projectPath) {
        formData.append('projectPath', projectPath);
      }

      // 處理附件
      if (attachments && attachments.length > 0) {
        attachments.forEach((file, index) => {
          formData.append(`attachment_${index}`, file);
        });
        formData.append('attachmentCount', attachments.length.toString());
      }

      // 建立新的 AbortController
      this.abortController = new AbortController();

      // 使用新的極簡 query API
      const response = await fetch('/api/claude/query', {
        method: 'POST',
        body: formData,
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      // 新的 API 會回傳 Server-Sent Events
      return {
        success: true,
        data: {
          stream: response.body || undefined
        }
      };

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: 'Request was cancelled'
        };
      }
      
      console.error('[ClaudeCodeService] Send message failed:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        claudeSessionId: claudeSessionId,
        timestamp: new Date().toISOString()
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // 新增 SSE 事件流處理方法
  async sendMessageWithSSE(
    options: SendMessageOptions,
    onEvent: (event: StreamEvent) => void,
    claudeSessionId?: string | null
  ): Promise<void> {
    const { content, attachments, projectPath } = options;

    try {
      // 準備請求資料 - 使用新的極簡 API
      const formData = new FormData();
      formData.append('message', content);
      if (claudeSessionId) {
        formData.append('clientSessionId', claudeSessionId); // 向後相容：API 還期待 clientSessionId
      }
      
      if (projectPath) {
        formData.append('projectPath', projectPath);
      }

      // 處理附件
      if (attachments && attachments.length > 0) {
        attachments.forEach((file, index) => {
          formData.append(`attachment_${index}`, file);
        });
        formData.append('attachmentCount', attachments.length.toString());
      }

      // 建立新的 AbortController
      this.abortController = new AbortController();

      // 使用新的極簡 query API
      const response = await fetch('/api/claude/query', {
        method: 'POST',
        body: formData,
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      // 處理 Server-Sent Events
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body available');
      }

      try {
        let buffer = '';
        const MAX_BUFFER_SIZE = appConfig.getSSEBufferSize(); // 可配置的 SSE buffer 大小

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          
          // Check buffer size limit to prevent memory leaks
          if (buffer.length + chunk.length > MAX_BUFFER_SIZE) {
            const bufferSizeMB = MAX_BUFFER_SIZE / (1024 * 1024);
            console.error(`SSE buffer size exceeded limit (${bufferSizeMB}MB), dropping connection`);
            throw new Error(`SSE buffer size exceeded maximum limit (${bufferSizeMB}MB)`);
          }

          buffer += chunk;
          
          // 處理完整的事件
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // 保留不完整的行

          let currentEvent: { type?: string; data?: string } = {};

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEvent.type = line.substring(7);
            } else if (line.startsWith('data: ')) {
              currentEvent.data = line.substring(6);
            } else if (line === '' && currentEvent.type && currentEvent.data) {
              // 完整事件，處理它
              try {
                const eventData = JSON.parse(currentEvent.data);
                onEvent({
                  type: currentEvent.type as StreamEvent['type'],
                  data: eventData
                });
              } catch (parseError) {
                console.warn('Failed to parse event data:', parseError);
              }
              currentEvent = {};
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // 取消請求時發送 complete 事件而不是 error 事件
        onEvent({
          type: 'complete',
          data: { 
            message: 'Request cancelled by user',
            cancelled: true 
          }
        });
      } else {
        console.error('SSE stream error:', error);
        onEvent({
          type: 'error',
          data: { error: error instanceof Error ? error.message : 'Unknown error' }
        });
      }
    }
  }

  async *streamResponse(stream: ReadableStream<Uint8Array>): AsyncGenerator<string, void, unknown> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }
        
        const chunk = decoder.decode(value, { stream: true });
        yield chunk;
      }
    } finally {
      reader.releaseLock();
    }
  }

  async cancelCurrentRequest(claudeSessionId?: string | null): Promise<void> {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
      
      // 也通過 API 中斷後端查詢
      if (claudeSessionId) {
        try {
          await fetch(`/api/claude/query?clientSessionId=${encodeURIComponent(claudeSessionId)}`, {
            method: 'DELETE'
          });
        } catch (error) {
          console.warn('[ClaudeCodeService] Failed to interrupt backend query:', error);
        }
      }
    }
  }

  isAuthenticated(): boolean {
    return this.authenticated;
  }

  // getCurrentProject 不再需要，因為 projectPath 現在在每次請求中直接傳遞

  // 在新架構中，消息歷史由前端 UI 自己管理，不依賴後端
  async getMessageHistory(projectPath: string): Promise<Message[]> {
    console.log('[ClaudeCodeService] Message history requested for:', projectPath);
    console.log('[ClaudeCodeService] In new architecture, message history is managed by UI state');
    console.log('[ClaudeCodeService] Claude Code SDK handles conversation context via resume mechanism');
    return []; // 返回空陣列，讓前端 UI 自己管理消息狀態
  }

  // 輔助方法：處理檔案上傳
  async processFileAttachments(files: File[]): Promise<FileAttachment[]> {
    const attachments: FileAttachment[] = [];
    
    for (const file of files) {
      const attachment: FileAttachment = {
        id: uuidv4(),
        name: file.name,
        type: file.type,
        size: file.size,
      };

      // 如果是文字檔案，讀取內容
      if (file.type.startsWith('text/') || file.name.endsWith('.md') || 
          file.name.endsWith('.txt') || file.name.endsWith('.json')) {
        try {
          const content = await file.text();
          attachment.content = content;
        } catch (error) {
          console.warn(`Failed to read file content: ${file.name}`, error);
        }
      }

      attachments.push(attachment);
    }

    return attachments;
  }

  // 建立測試訊息（開發期間使用）
  createTestMessage(content: string, role: 'user' | 'assistant' = 'assistant'): Message {
    return {
      id: uuidv4(),
      role,
      content,
      timestamp: new Date(),
      status: 'sent'
    };
  }
}

// 單例模式
export const claudeCodeService = new ClaudeCodeService();
export default claudeCodeService;