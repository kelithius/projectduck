import { ClaudeSession, type ClaudeSessionOptions } from './claudeSession';
import { Message } from '@/lib/types/chat';

export class SessionManager {
  private sessions: Map<string, ClaudeSession> = new Map();
  private sessionLastActive: Map<string, number> = new Map();
  private activeSessionId: string | null = null;
  private static instance: SessionManager;

  // Singleton pattern
  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  private constructor() {
    // 從 localStorage 恢復 sessions（如果在瀏覽器環境）
    this.loadSessionsFromStorage();
    
    // 每 30 分鐘清理一次非活躍的 session
    setInterval(() => {
      this.cleanupInactiveSessions();
    }, 30 * 60 * 1000);
  }

  public createSession(projectPath: string, browserSessionId?: string, options?: Partial<ClaudeSessionOptions>): ClaudeSession {
    // 使用專案路徑作為唯一識別碼
    const sessionKey = this.normalizeProjectPath(projectPath, browserSessionId);
    
    // 如果已有相同專案的 session，返回現有的
    if (this.sessions.has(sessionKey)) {
      return this.sessions.get(sessionKey)!;
    }

    const sessionOptions: ClaudeSessionOptions = {
      projectPath,
      permissionMode: 'default',
      allowedTools: ['Read', 'Write', 'Bash', 'Edit'],
      maxTurns: 50,
      ...options
    };

    const session = new ClaudeSession(sessionOptions);
    this.sessions.set(sessionKey, session);
    this.sessionLastActive.set(sessionKey, Date.now());
    
    // 儲存到 localStorage
    this.saveSessionsToStorage();
    
    return session;
  }

  public getSession(projectPath: string, browserSessionId?: string): ClaudeSession | null {
    const sessionKey = this.normalizeProjectPath(projectPath, browserSessionId);
    return this.sessions.get(sessionKey) || null;
  }

  public switchSession(projectPath: string, browserSessionId?: string): ClaudeSession {
    const sessionKey = this.normalizeProjectPath(projectPath, browserSessionId);
    let session = this.sessions.get(sessionKey);

    if (!session) {
      session = this.createSession(projectPath, browserSessionId);
    }

    // 更新活躍時間
    this.sessionLastActive.set(sessionKey, Date.now());
    this.activeSessionId = sessionKey;
    return session;
  }

  public getActiveSession(): ClaudeSession | null {
    if (!this.activeSessionId) {
      return null;
    }
    return this.sessions.get(this.activeSessionId) || null;
  }

  public getActiveSessionId(): string | null {
    return this.activeSessionId;
  }

  public getAllSessions(): Array<{ projectPath: string; session: ClaudeSession }> {
    return Array.from(this.sessions.entries()).map(([, session]) => ({
      projectPath: session.getProjectPath(),
      session
    }));
  }

  public async clearSession(projectPath: string, browserSessionId?: string): Promise<void> {
    const sessionKey = this.normalizeProjectPath(projectPath, browserSessionId);
    const session = this.sessions.get(sessionKey);
    
    if (session) {
      // 中斷當前查詢
      await session.interrupt();
      // 清空訊息歷史
      session.clear();
      // 儲存變更
      this.saveSessionsToStorage();
    }
  }

  public async removeSession(projectPath: string, browserSessionId?: string): Promise<void> {
    const sessionKey = this.normalizeProjectPath(projectPath, browserSessionId);
    const session = this.sessions.get(sessionKey);
    
    if (session) {
      // 先中斷查詢
      await session.interrupt();
      // 從 Map 中移除
      this.sessions.delete(sessionKey);
      
      // 如果刪除的是活動 session，清空活動狀態
      if (this.activeSessionId === sessionKey) {
        this.activeSessionId = null;
      }
      
      // 儲存變更
      this.saveSessionsToStorage();
    }
  }

  public async interruptAllSessions(): Promise<void> {
    const promises = Array.from(this.sessions.values()).map(session => 
      session.interrupt()
    );
    
    await Promise.all(promises);
  }

  public getSessionCount(): number {
    return this.sessions.size;
  }

  public hasActiveSession(): boolean {
    return this.activeSessionId !== null && this.sessions.has(this.activeSessionId);
  }

  // 取得所有專案路徑
  public getAllProjectPaths(): string[] {
    return Array.from(this.sessions.values()).map(session => session.getProjectPath());
  }

  // 取得特定專案的訊息數量
  public getMessageCount(projectPath: string): number {
    const session = this.getSession(projectPath);
    return session ? session.getMessageHistory().length : 0;
  }

  // 取得所有專案的總訊息數
  public getTotalMessageCount(): number {
    return Array.from(this.sessions.values()).reduce(
      (total, session) => total + session.getMessageHistory().length,
      0
    );
  }

  // 搜尋訊息
  public searchMessages(query: string, projectPath?: string): Array<{
    projectPath: string;
    messages: Message[];
  }> {
    const results: Array<{ projectPath: string; messages: Message[] }> = [];
    const sessionsToSearch = projectPath 
      ? [this.getSession(projectPath)].filter(Boolean) as ClaudeSession[]
      : Array.from(this.sessions.values());

    for (const session of sessionsToSearch) {
      const matchingMessages = session.getMessageHistory().filter(message =>
        message.content.toLowerCase().includes(query.toLowerCase())
      );

      if (matchingMessages.length > 0) {
        results.push({
          projectPath: session.getProjectPath(),
          messages: matchingMessages
        });
      }
    }

    return results;
  }

  // 清理非活躍的 session (超過 1 小時未使用)
  private cleanupInactiveSessions(): void {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000; // 1 小時
    
    const inactiveKeys: string[] = [];
    
    for (const [sessionKey, lastActive] of this.sessionLastActive.entries()) {
      if (now - lastActive > oneHour) {
        inactiveKeys.push(sessionKey);
      }
    }
    
    for (const sessionKey of inactiveKeys) {
      const session = this.sessions.get(sessionKey);
      if (session) {
        console.log(`[SessionManager] Cleaning up inactive session: ${sessionKey}`);
        session.interrupt().catch(() => {}); // 嘗試中斷但不等待
        this.sessions.delete(sessionKey);
        this.sessionLastActive.delete(sessionKey);
        
        if (this.activeSessionId === sessionKey) {
          this.activeSessionId = null;
        }
      }
    }
    
    if (inactiveKeys.length > 0) {
      console.log(`[SessionManager] Cleaned up ${inactiveKeys.length} inactive sessions`);
    }
  }

  private normalizeProjectPath(projectPath: string, browserSessionId?: string): string {
    // 標準化專案路徑，移除末尾斜槓並轉換為絕對路徑
    const normalizedPath = projectPath.replace(/\/+$/, '').toLowerCase();
    // 如果有瀏覽器 session ID，加入作為區隔符
    return browserSessionId ? `${normalizedPath}#${browserSessionId}` : normalizedPath;
  }

  private loadSessionsFromStorage(): void {
    if (typeof window === 'undefined') return; // SSR 環境下跳過

    try {
      const stored = localStorage.getItem('claude_sessions');
      if (stored) {
        const data = JSON.parse(stored);
        
        // 恢復 sessions
        if (data.sessions) {
          for (const [key, sessionData] of Object.entries(data.sessions)) {
            try {
              const session = ClaudeSession.fromJSON(sessionData as Parameters<typeof ClaudeSession.fromJSON>[0]);
              this.sessions.set(key, session);
            } catch (error) {
              console.warn(`Failed to restore session ${key}:`, error);
            }
          }
        }
        
        // 恢復 active session
        if (data.activeSessionId && this.sessions.has(data.activeSessionId)) {
          this.activeSessionId = data.activeSessionId;
        }
      }
    } catch (error) {
      console.error('Failed to load sessions from storage:', error);
    }
  }

  private saveSessionsToStorage(): void {
    if (typeof window === 'undefined') return; // SSR 環境下跳過

    try {
      const data = {
        sessions: Object.fromEntries(
          Array.from(this.sessions.entries()).map(([key, session]) => [
            key,
            session.toJSON()
          ])
        ),
        activeSessionId: this.activeSessionId,
        lastSaved: new Date().toISOString()
      };

      localStorage.setItem('claude_sessions', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save sessions to storage:', error);
    }
  }

  // 清空所有儲存的資料
  public clearAllSessions(): void {
    this.interruptAllSessions();
    this.sessions.clear();
    this.activeSessionId = null;
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('claude_sessions');
    }
  }

  // 匯出 sessions 資料
  public exportSessions(): string {
    const data = {
      sessions: Object.fromEntries(
        Array.from(this.sessions.entries()).map(([key, session]) => [
          key,
          session.toJSON()
        ])
      ),
      activeSessionId: this.activeSessionId,
      exportDate: new Date().toISOString(),
      version: '1.0.0'
    };

    return JSON.stringify(data, null, 2);
  }

  // 匯入 sessions 資料
  public importSessions(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.sessions) {
        // 清空現有 sessions
        this.clearAllSessions();
        
        // 匯入新 sessions
        for (const [key, sessionData] of Object.entries(data.sessions)) {
          try {
            const session = ClaudeSession.fromJSON(sessionData as Parameters<typeof ClaudeSession.fromJSON>[0]);
            this.sessions.set(key, session);
          } catch (error) {
            console.warn(`Failed to import session ${key}:`, error);
          }
        }
        
        // 設定 active session
        if (data.activeSessionId && this.sessions.has(data.activeSessionId)) {
          this.activeSessionId = data.activeSessionId;
        }
        
        this.saveSessionsToStorage();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to import sessions:', error);
      return false;
    }
  }
}

// 匯出單例實例
export const sessionManager = SessionManager.getInstance();