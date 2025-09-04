/**
 * ClientFileWatcher - 檔案變動監控服務（客戶端版本）
 * 
 * 功能：
 * - 透過 SSE 監控單個檔案的變更、移動、刪除事件
 * - 提供檔案狀態變更的回調機制
 * - 自動清理不再需要的監控器，防止記憶體洩漏
 * - 支援多個回調函數的註冊和管理
 */

import { FileItem } from '@/lib/types';

/**
 * 檔案變動事件類型
 */
export type FileWatchEvent = 
  | 'change'     // 檔案內容變更
  | 'unlink'     // 檔案被刪除
  | 'add'        // 檔案被新增（重新建立）
  | 'move'       // 檔案被移動（透過 unlink + add 檢測）
  | 'error';     // 監控錯誤

/**
 * 檔案變動事件數據
 */
export interface FileWatchEventData {
  event: FileWatchEvent;
  filePath: string;
  newPath?: string;  // 當事件為 'move' 時提供新路徑
  error?: Error;     // 當事件為 'error' 時提供錯誤信息
  file?: FileItem | null;  // 更新後的檔案信息，null 表示檔案不存在
}

/**
 * 檔案變動回調函數類型
 */
export type FileWatchCallback = (data: FileWatchEventData) => void;

/**
 * SSE 訊息類型
 */
interface SSEMessage {
  type: 'connected' | 'change' | 'unlink' | 'add' | 'error' | 'heartbeat';
  filePath?: string;
  error?: string;
  timestamp: number;
}

/**
 * 監控器配置
 */
interface WatcherConfig {
  eventSource: EventSource;
  filePath: string;
  basePath: string;
  callbacks: Set<FileWatchCallback>;
  lastSeenPath?: string;  // 用於檢測檔案移動
}

/**
 * ClientFileWatcher 類
 */
class ClientFileWatcher {
  private watchers: Map<string, WatcherConfig> = new Map();
  private pendingMoves: Map<string, { path: string; timer: NodeJS.Timeout }> = new Map();
  
  /**
   * 開始監控指定檔案
   * @param filePath 要監控的檔案路徑（相對或絕對路徑）
   * @param basePath 基本路徑
   * @param callback 檔案變動時的回調函數
   * @returns 取消監控的清理函數
   */
  public watchFile(filePath: string, basePath: string, callback: FileWatchCallback): () => void {
    console.log(`[ClientFileWatcher] Starting to watch file: ${filePath} (base: ${basePath})`);
    
    const watchKey = `${basePath}:${filePath}`;
    
    // 檢查是否已經有監控器
    let config = this.watchers.get(watchKey);
    
    if (config) {
      // 已經存在監控器，只需要添加回調
      config.callbacks.add(callback);
      console.log(`[ClientFileWatcher] Added callback to existing watcher for: ${filePath}`);
    } else {
      // 建立新的監控器
      try {
        // 建立 EventSource 連接到 SSE API
        const url = new URL('/api/file/watch', window.location.origin);
        url.searchParams.set('path', filePath);
        url.searchParams.set('basePath', basePath);
        
        const eventSource = new EventSource(url.toString());
        
        const callbacks = new Set<FileWatchCallback>();
        callbacks.add(callback);

        config = {
          eventSource,
          filePath,
          basePath,
          callbacks,
          lastSeenPath: filePath
        };

        this.watchers.set(watchKey, config);
        this.setupSSEEvents(config);
        
        console.log(`[ClientFileWatcher] Created new SSE watcher for: ${filePath}`);
      } catch (error) {
        console.error(`[ClientFileWatcher] Failed to create watcher for ${filePath}:`, error);
        callback({
          event: 'error',
          filePath,
          error: error instanceof Error ? error : new Error('Failed to create watcher')
        });
      }
    }

    // 返回清理函數
    return () => {
      this.removeCallback(watchKey, callback);
    };
  }

  /**
   * 停止監控指定檔案（移除所有回調）
   * @param watchKey 監控鍵值
   */
  public unwatchFile(watchKey: string): void {
    const config = this.watchers.get(watchKey);
    if (config) {
      console.log(`[ClientFileWatcher] Stopping watch for: ${watchKey}`);
      config.eventSource.close();
      this.watchers.delete(watchKey);
      
      // 清理可能存在的待處理移動檢測
      this.cleanupPendingMove(config.filePath);
    }
  }

  /**
   * 移除指定的回調函數，如果沒有其他回調則停止監控
   * @param watchKey 監控鍵值
   * @param callback 要移除的回調函數
   */
  private removeCallback(watchKey: string, callback: FileWatchCallback): void {
    const config = this.watchers.get(watchKey);
    if (!config) return;

    config.callbacks.delete(callback);
    
    // 如果沒有其他回調，停止監控
    if (config.callbacks.size === 0) {
      console.log(`[ClientFileWatcher] No more callbacks, stopping watch for: ${watchKey}`);
      this.unwatchFile(watchKey);
    }
  }

  /**
   * 設置 SSE 事件處理
   * @param config 監控器配置
   */
  private setupSSEEvents(config: WatcherConfig): void {
    const { eventSource, filePath, callbacks } = config;

    // 處理接收到的 SSE 訊息
    eventSource.onmessage = (event) => {
      try {
        const message: SSEMessage = JSON.parse(event.data);
        console.log(`[ClientFileWatcher] SSE message received:`, message);
        
        switch (message.type) {
          case 'connected':
            console.log(`[ClientFileWatcher] SSE connected for: ${filePath}`);
            break;
          
          case 'change':
            console.log(`[ClientFileWatcher] File changed: ${filePath}`);
            this.notifyCallbacks(callbacks, {
              event: 'change',
              filePath
            });
            break;
          
          case 'unlink':
            console.log(`[ClientFileWatcher] File unlinked: ${filePath}`);
            
            // 設置延遲檢測，以區分刪除和移動
            this.pendingMoves.set(filePath, {
              path: filePath,
              timer: setTimeout(() => {
                // 延遲後確認是真正的刪除
                console.log(`[ClientFileWatcher] File confirmed deleted: ${filePath}`);
                this.notifyCallbacks(callbacks, {
                  event: 'unlink',
                  filePath,
                  file: null
                });
                this.cleanupPendingMove(filePath);
              }, 500) // 500ms 延遲檢測移動
            });
            break;
          
          case 'add':
            console.log(`[ClientFileWatcher] File added: ${message.filePath}`);
            
            // 檢查是否是移動操作的結果
            const pendingMove = this.pendingMoves.get(filePath);
            if (pendingMove && message.filePath !== filePath) {
              // 檢測到移動
              console.log(`[ClientFileWatcher] File moved: ${filePath} -> ${message.filePath}`);
              this.cleanupPendingMove(filePath);
              
              this.notifyCallbacks(callbacks, {
                event: 'move',
                filePath,
                newPath: message.filePath
              });
              
              // 更新監控路徑
              config.lastSeenPath = message.filePath;
            } else {
              // 普通的檔案新增（重新建立）
              this.notifyCallbacks(callbacks, {
                event: 'add',
                filePath: message.filePath || filePath
              });
            }
            break;
          
          case 'error':
            console.error(`[ClientFileWatcher] SSE error for ${filePath}:`, message.error);
            this.notifyCallbacks(callbacks, {
              event: 'error',
              filePath,
              error: new Error(message.error || 'Unknown SSE error')
            });
            break;
          
          case 'heartbeat':
            // 心跳訊息，不需要特別處理
            break;
        }
      } catch (error) {
        console.error('[ClientFileWatcher] Error parsing SSE message:', error);
      }
    };

    // SSE 連接錯誤處理
    eventSource.onerror = (error) => {
      // 只在開發環境記錄詳細錯誤，避免生產環境的噪音
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[ClientFileWatcher] SSE connection lost for ${filePath}`);
      }
      
      // 嘗試重連
      setTimeout(() => {
        if (this.watchers.has(filePath)) {
          console.log(`[ClientFileWatcher] Attempting to reconnect ${filePath}`);
          this.stopWatching(filePath);
          this.watchFile(filePath, callback);
        }
      }, 3000);
    };

    // SSE 連接開啟事件
    eventSource.onopen = () => {
      console.log(`[ClientFileWatcher] SSE connection opened for: ${filePath}`);
    };
  }

  /**
   * 通知所有回調函數
   * @param callbacks 回調函數集合
   * @param data 事件數據
   */
  private notifyCallbacks(callbacks: Set<FileWatchCallback>, data: FileWatchEventData): void {
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('[ClientFileWatcher] Callback error:', error);
      }
    });
  }

  /**
   * 清理待處理的移動檢測
   * @param filePath 檔案路徑
   */
  private cleanupPendingMove(filePath: string): void {
    const pending = this.pendingMoves.get(filePath);
    if (pending) {
      clearTimeout(pending.timer);
      this.pendingMoves.delete(filePath);
    }
  }

  /**
   * 獲取當前監控的檔案列表
   * @returns 正在監控的檔案路徑陣列
   */
  public getWatchedFiles(): string[] {
    return Array.from(this.watchers.keys());
  }

  /**
   * 清理所有監控器
   */
  public cleanup(): void {
    console.log('[ClientFileWatcher] Cleaning up all watchers...');
    
    // 清理所有監控器
    this.watchers.forEach((config, watchKey) => {
      config.eventSource.close();
    });
    this.watchers.clear();
    
    // 清理待處理的移動檢測
    this.pendingMoves.forEach(pending => {
      clearTimeout(pending.timer);
    });
    this.pendingMoves.clear();
    
    console.log('[ClientFileWatcher] All watchers cleaned up');
  }
}

// 建立單例實例
const clientFileWatcher = new ClientFileWatcher();

export default clientFileWatcher;