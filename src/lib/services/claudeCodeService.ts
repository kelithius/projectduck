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

class ClaudeCodeService {
  private authenticated: boolean = false;
  private currentProject: string | null = null;
  private abortController: AbortController | null = null;

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
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // 檢查是否為串流回應
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('text/stream')) {
        return {
          success: true,
          data: {
            stream: response.body || undefined
          }
        };
      } else {
        const result = await response.json();
        return {
          success: result.success || false,
          data: result.data,
          error: result.error
        };
      }
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