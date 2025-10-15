/**
 * DirectoryWatcher - 目錄變動監控服務（客戶端版本）
 *
 * 功能：
 * - 透過 SSE 監控目錄和子目錄的檔案變更事件
 * - 提供目錄變動的回調機制
 * - 支援多個回調函數的註冊和管理
 * - 自動清理不再需要的監控器，防止記憶體洩漏
 * - 支援遞迴和非遞迴監控模式
 */

import {
  DirectoryWatchEvent,
  DirectoryWatchCallback,
  DirectoryWatcherConfig,
} from "@/lib/types";

/**
 * 監控器配置內部結構
 */
interface WatcherConfig {
  eventSource: EventSource;
  basePath: string;
  targetPath: string;
  recursive: boolean;
  callbacks: Set<DirectoryWatchCallback>;
}

/**
 * DirectoryWatcher 類
 */
class DirectoryWatcher {
  private watchers: Map<string, WatcherConfig> = new Map();

  /**
   * 開始監控指定目錄
   * @param config 監控配置
   * @returns 取消監控的清理函數
   */
  public watchDirectory(config: DirectoryWatcherConfig): () => void {
    const { basePath, targetPath, recursive, callback } = config;
    const watchKey = `${basePath}:${targetPath}:${recursive}`;

    console.log(
      `[DirectoryWatcher] Starting to watch directory: ${targetPath} (base: ${basePath}, recursive: ${recursive})`,
    );

    // 檢查是否已經有監控器
    let watcherConfig = this.watchers.get(watchKey);

    if (watcherConfig) {
      // 已經存在監控器，只需要添加回調
      watcherConfig.callbacks.add(callback);
      console.log(
        `[DirectoryWatcher] Added callback to existing watcher for: ${targetPath}`,
      );
    } else {
      // 建立新的監控器
      try {
        // 建立 EventSource 連接到 SSE API
        const url = new URL("/api/directory/watch", window.location.origin);
        url.searchParams.set("path", targetPath || "");
        url.searchParams.set("basePath", basePath);
        url.searchParams.set("recursive", recursive.toString());

        console.log(
          `[DirectoryWatcher] Creating SSE connection to: ${url.toString()}`,
        );

        const eventSource = new EventSource(url.toString());

        const callbacks = new Set<DirectoryWatchCallback>();
        callbacks.add(callback);

        watcherConfig = {
          eventSource,
          basePath,
          targetPath,
          recursive,
          callbacks,
        };

        this.watchers.set(watchKey, watcherConfig);
        this.setupSSEEvents(watcherConfig);

        console.log(
          `[DirectoryWatcher] Created new SSE watcher for: ${targetPath}`,
        );
      } catch (error) {
        console.error(
          `[DirectoryWatcher] Failed to create watcher for ${targetPath}:`,
          error,
        );
        callback({
          type: "error",
          path: targetPath,
          error:
            error instanceof Error ? error.message : "Failed to create watcher",
          timestamp: Date.now(),
        });
      }
    }

    // 返回清理函數
    return () => {
      this.removeCallback(watchKey, callback);
    };
  }

  /**
   * 停止監控指定目錄（移除所有回調）
   * @param watchKey 監控鍵值
   */
  public unwatchDirectory(watchKey: string): void {
    const config = this.watchers.get(watchKey);
    if (config) {
      console.log(`[DirectoryWatcher] Stopping watch for: ${watchKey}`);
      config.eventSource.close();
      this.watchers.delete(watchKey);
    }
  }

  /**
   * 移除指定的回調函數，如果沒有其他回調則停止監控
   * @param watchKey 監控鍵值
   * @param callback 要移除的回調函數
   */
  private removeCallback(
    watchKey: string,
    callback: DirectoryWatchCallback,
  ): void {
    const config = this.watchers.get(watchKey);
    if (!config) return;

    config.callbacks.delete(callback);

    // 如果沒有其他回調，停止監控
    if (config.callbacks.size === 0) {
      console.log(
        `[DirectoryWatcher] No more callbacks, stopping watch for: ${watchKey}`,
      );
      this.unwatchDirectory(watchKey);
    }
  }

  /**
   * 設置 SSE 事件處理
   * @param config 監控器配置
   */
  private setupSSEEvents(config: WatcherConfig): void {
    const { eventSource, targetPath, callbacks } = config;

    // 處理接收到的 SSE 訊息
    eventSource.onmessage = (event) => {
      try {
        const message: DirectoryWatchEvent = JSON.parse(event.data);
        console.log(`[DirectoryWatcher] SSE message received:`, message);

        // 過濾心跳訊息
        if (message.type === "heartbeat") {
          return;
        }

        // 通知所有回調
        console.log(
          `[DirectoryWatcher] Notifying ${callbacks.size} callbacks for event:`,
          message,
        );
        this.notifyCallbacks(callbacks, message);
      } catch (error) {
        console.error("[DirectoryWatcher] Error parsing SSE message:", error);
      }
    };

    // SSE 連接錯誤處理
    eventSource.onerror = (error) => {
      console.warn(
        `[DirectoryWatcher] SSE connection issue for ${targetPath}:`,
        error,
      );

      // 通知錯誤
      this.notifyCallbacks(callbacks, {
        type: "error",
        path: targetPath,
        error: "SSE connection lost",
        timestamp: Date.now(),
      });
    };

    // SSE 連接開啟事件
    eventSource.onopen = () => {
      console.log(
        `[DirectoryWatcher] SSE connection opened for: ${targetPath}`,
      );
    };
  }

  /**
   * 通知所有回調函數
   * @param callbacks 回調函數集合
   * @param event 目錄變動事件
   */
  private notifyCallbacks(
    callbacks: Set<DirectoryWatchCallback>,
    event: DirectoryWatchEvent,
  ): void {
    callbacks.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.error("[DirectoryWatcher] Callback error:", error);
      }
    });
  }

  /**
   * 獲取當前監控的目錄列表
   * @returns 正在監控的目錄列表
   */
  public getWatchedDirectories(): Array<{
    basePath: string;
    targetPath: string;
    recursive: boolean;
  }> {
    return Array.from(this.watchers.values()).map((config) => ({
      basePath: config.basePath,
      targetPath: config.targetPath,
      recursive: config.recursive,
    }));
  }

  /**
   * 檢查指定目錄是否正在被監控
   * @param basePath 基礎路徑
   * @param targetPath 目標路徑
   * @param recursive 是否遞迴
   * @returns 是否正在監控
   */
  public isWatching(
    basePath: string,
    targetPath: string,
    recursive: boolean,
  ): boolean {
    const watchKey = `${basePath}:${targetPath}:${recursive}`;
    return this.watchers.has(watchKey);
  }

  /**
   * 清理所有監控器
   */
  public cleanup(): void {
    console.log("[DirectoryWatcher] Cleaning up all watchers...");

    // 清理所有監控器
    this.watchers.forEach((config, _watchKey) => {
      config.eventSource.close();
    });
    this.watchers.clear();

    console.log("[DirectoryWatcher] All watchers cleaned up");
  }

  /**
   * 重新連接所有監控器（用於網絡恢復後）
   */
  public reconnectAll(): void {
    console.log("[DirectoryWatcher] Reconnecting all watchers...");

    const currentConfigs = Array.from(this.watchers.entries()).map(
      ([watchKey, config]) => ({
        watchKey,
        basePath: config.basePath,
        targetPath: config.targetPath,
        recursive: config.recursive,
        callbacks: Array.from(config.callbacks),
      }),
    );

    // 清理現有連接
    this.cleanup();

    // 重新建立連接
    currentConfigs.forEach(({ basePath, targetPath, recursive, callbacks }) => {
      callbacks.forEach((callback) => {
        this.watchDirectory({ basePath, targetPath, recursive, callback });
      });
    });
  }
}

// 建立單例實例
const directoryWatcher = new DirectoryWatcher();

export default directoryWatcher;
