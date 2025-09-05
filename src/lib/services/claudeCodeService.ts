import { v4 as uuidv4 } from 'uuid';
import { Message, SendMessageOptions, FileAttachment } from '@/lib/types/chat';

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
  type: 'start' | 'message' | 'complete' | 'error';
  data: unknown;
}

class ClaudeCodeService {
  private authenticated: boolean = false;
  private currentProject: string | null = null;
  private abortController: AbortController | null = null;
  private browserSessionId: string;

  constructor() {
    // 每次頁面載入生成新的 session ID
    this.browserSessionId = crypto.randomUUID();
    console.log(`[ClaudeCodeService] Generated new browser session ID: ${this.browserSessionId}`);
  }


  async clearSession(projectPath: string): Promise<boolean> {
    try {
      // 調用後端 API 來清除 Claude SDK session
      const response = await fetch(`/api/claude/session/clear?projectPath=${encodeURIComponent(projectPath)}&browserSessionId=${encodeURIComponent(this.browserSessionId)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.warn('Failed to clear session:', response.statusText);
        return false;
      }

      const result = await response.json();
      return result.success || false;
    } catch (error) {
      console.warn('Error clearing session:', error);
      return false;
    }
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
      console.error('Failed to check authentication:', error);
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

  async setWorkingDirectory(projectPath: string): Promise<boolean> {
    try {
      const response = await fetch('/api/claude/project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectPath }),
      });
      
      const result = await response.json();
      if (result.success) {
        this.currentProject = projectPath;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to set working directory:', error);
      return false;
    }
  }

  async sendMessage(options: SendMessageOptions): Promise<ClaudeCodeResponse> {
    const { content, attachments, projectPath } = options;

    try {
      // 如果提供了專案路徑且與當前不同，先切換專案
      if (projectPath && projectPath !== this.currentProject) {
        await this.setWorkingDirectory(projectPath);
      }

      // 準備請求資料
      const formData = new FormData();
      formData.append('message', content);
      formData.append('browserSessionId', this.browserSessionId);
      
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

      const response = await fetch('/api/claude/chat', {
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
      
      console.error('Failed to send message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // 新增 SSE 事件流處理方法
  async sendMessageWithSSE(
    options: SendMessageOptions,
    onEvent: (event: StreamEvent) => void
  ): Promise<void> {
    const { content, attachments, projectPath } = options;

    try {
      // 準備請求資料
      const formData = new FormData();
      formData.append('message', content);
      formData.append('browserSessionId', this.browserSessionId);
      
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

      const response = await fetch('/api/claude/chat', {
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

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          
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

  cancelCurrentRequest(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  isAuthenticated(): boolean {
    return this.authenticated;
  }

  getCurrentProject(): string | null {
    return this.currentProject;
  }

  getBrowserSessionId(): string {
    return this.browserSessionId;
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