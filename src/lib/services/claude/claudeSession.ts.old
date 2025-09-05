import { v4 as uuidv4 } from 'uuid';
import { type Query, type SDKMessage, type PermissionMode } from '@anthropic-ai/claude-code';
import { Message, FileAttachment } from '@/lib/types/chat';

export interface ClaudeSessionOptions {
  projectPath: string;
  permissionMode?: PermissionMode;
  allowedTools?: string[];
  maxTurns?: number;
}

export class ClaudeSession {
  private sessionId: string;
  private projectPath: string;
  private messageHistory: Message[] = [];
  private sdkMessageHistory: SDKMessage[] = [];
  private currentQuery: Query | null = null;
  private abortController: AbortController | null = null;
  private isActive: boolean = false;
  private options: ClaudeSessionOptions;

  constructor(options: ClaudeSessionOptions) {
    this.sessionId = uuidv4();
    this.projectPath = options.projectPath;
    this.options = options;
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  public getProjectPath(): string {
    return this.projectPath;
  }

  public getMessageHistory(): Message[] {
    return [...this.messageHistory];
  }

  public getSdkMessageHistory(): SDKMessage[] {
    return [...this.sdkMessageHistory];
  }

  public isSessionActive(): boolean {
    return this.isActive;
  }

  public addUserMessage(content: string, attachments?: FileAttachment[]): Message {
    const message: Message = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: new Date(),
      attachments,
      status: 'sent'
    };

    this.messageHistory.push(message);
    return message;
  }

  public addAssistantMessage(content: string): Message {
    const message: Message = {
      id: uuidv4(),
      role: 'assistant',
      content,
      timestamp: new Date(),
      status: 'sent'
    };

    this.messageHistory.push(message);
    return message;
  }

  public updateLastMessage(content: string, status?: Message['status']): void {
    const lastMessage = this.messageHistory[this.messageHistory.length - 1];
    if (lastMessage) {
      lastMessage.content = content;
      if (status) {
        lastMessage.status = status;
      }
    }
  }

  public addSdkMessage(message: SDKMessage): void {
    this.sdkMessageHistory.push(message);
  }

  public setCurrentQuery(query: Query): void {
    this.currentQuery = query;
    this.isActive = true;
  }

  public clearCurrentQuery(): void {
    this.currentQuery = null;
    this.isActive = false;
  }

  public async interrupt(): Promise<void> {
    if (this.currentQuery && this.isActive) {
      try {
        await this.currentQuery.interrupt();
        this.clearCurrentQuery();
      } catch (error) {
        console.error('Failed to interrupt query:', error);
      }
    }
    
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  public async setPermissionMode(mode: PermissionMode): Promise<void> {
    if (this.currentQuery && this.isActive) {
      try {
        await this.currentQuery.setPermissionMode(mode);
        this.options.permissionMode = mode;
      } catch (error) {
        console.error('Failed to set permission mode:', error);
      }
    }
  }

  public setAbortController(controller: AbortController): void {
    this.abortController = controller;
  }

  public getAbortController(): AbortController | null {
    return this.abortController;
  }

  public clear(): void {
    this.messageHistory = [];
    this.sdkMessageHistory = [];
    this.interrupt();
  }

  public updateOptions(newOptions: Partial<ClaudeSessionOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  public getOptions(): ClaudeSessionOptions {
    return { ...this.options };
  }

  // 將 SDK 訊息轉換為 UI 訊息
  public convertSdkMessageToUiMessage(sdkMessage: SDKMessage): Message | null {
    switch (sdkMessage.type) {
      case 'assistant':
        if (sdkMessage.message.content) {
          const content = Array.isArray(sdkMessage.message.content) 
            ? sdkMessage.message.content.map((c: string | { type: string; text: string }) => 
                typeof c === 'string' ? c : c.type === 'text' ? c.text : ''
              ).join('')
            : typeof sdkMessage.message.content === 'string' 
              ? sdkMessage.message.content 
              : '';
          
          return {
            id: sdkMessage.uuid,
            role: 'assistant',
            content,
            timestamp: new Date(),
            status: 'sent'
          };
        }
        return null;
        
      case 'result':
        if (sdkMessage.subtype === 'success') {
          return {
            id: sdkMessage.uuid,
            role: 'assistant',
            content: sdkMessage.result,
            timestamp: new Date(),
            status: 'sent'
          };
        } else {
          return {
            id: sdkMessage.uuid,
            role: 'system',
            content: `執行失敗: ${sdkMessage.subtype}`,
            timestamp: new Date(),
            status: 'error'
          };
        }
        
      case 'system':
        return {
          id: sdkMessage.uuid,
          role: 'system',
          content: `系統初始化 - 專案: ${sdkMessage.cwd}, 模型: ${sdkMessage.model}`,
          timestamp: new Date(),
          status: 'sent'
        };
        
      default:
        return null;
    }
  }

  // 將 File 附件轉換為 SDK 可用格式
  public async processAttachments(files: File[]): Promise<FileAttachment[]> {
    const attachments: FileAttachment[] = [];
    
    for (const file of files) {
      const attachment: FileAttachment = {
        id: uuidv4(),
        name: file.name,
        type: file.type,
        size: file.size,
      };

      // 如果是文字檔案，讀取內容
      if (file.type.startsWith('text/') || 
          ['.md', '.txt', '.json', '.js', '.ts', '.py', '.css', '.html'].some(ext => file.name.endsWith(ext))) {
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

  public toJSON() {
    return {
      sessionId: this.sessionId,
      projectPath: this.projectPath,
      messageHistory: this.messageHistory,
      isActive: this.isActive,
      options: this.options,
      timestamp: new Date().toISOString()
    };
  }

  public static fromJSON(data: { projectPath: string; options?: ClaudeSessionOptions; messages?: Message[]; [key: string]: unknown }): ClaudeSession {
    const session = new ClaudeSession({
      projectPath: data.projectPath,
      ...data.options
    });
    
    session.sessionId = data.sessionId as string;
    session.messageHistory = (data.messageHistory as Message[]) || [];
    session.isActive = false; // 重新載入時不會是 active 狀態
    
    return session;
  }
}