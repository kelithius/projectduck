export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  attachments?: FileAttachment[];
  status?: 'sending' | 'sent' | 'error';
}

export interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  content?: string;
  path?: string;
  url?: string;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
  currentProject?: string;
}

export interface SendMessageOptions {
  content: string;
  attachments?: File[];
  projectPath?: string;
}