/**
 * ClientFileWatcher - File change monitoring service (client-side version)
 *
 * Features:
 * - Monitor single file change, move, and delete events via SSE
 * - Provide callback mechanism for file status changes
 * - Automatically cleanup unused watchers to prevent memory leaks
 * - Support registration and management of multiple callback functions
 */

import { FileItem } from "@/lib/types";

/**
 * File change event types
 */
export type FileWatchEvent =
  | "change" // File content changed
  | "unlink" // File deleted
  | "add" // File added (recreated)
  | "move" // File moved (detected via unlink + add)
  | "error"; // Watch error

/**
 * File change event data
 */
export interface FileWatchEventData {
  event: FileWatchEvent;
  filePath: string;
  newPath?: string; // Provides new path when event is 'move'
  error?: Error; // Provides error information when event is 'error'
  file?: FileItem | null; // Updated file information, null indicates file doesn't exist
}

/**
 * File change callback function type
 */
export type FileWatchCallback = (data: FileWatchEventData) => void;

/**
 * SSE message type
 */
interface SSEMessage {
  type: "connected" | "change" | "unlink" | "add" | "error" | "heartbeat";
  filePath?: string;
  error?: string;
  timestamp: number;
}

/**
 * Watcher configuration
 */
interface WatcherConfig {
  eventSource: EventSource;
  filePath: string;
  basePath: string;
  callbacks: Set<FileWatchCallback>;
  lastSeenPath?: string; // Used for detecting file moves
}

/**
 * ClientFileWatcher class
 */
class ClientFileWatcher {
  private watchers: Map<string, WatcherConfig> = new Map();
  private pendingMoves: Map<string, { path: string; timer: NodeJS.Timeout }> =
    new Map();

  /**
   * Start watching specified file
   * @param filePath - File path to watch (relative or absolute)
   * @param basePath - Base path
   * @param callback - Callback function for file changes
   * @returns Cleanup function to unwatch
   */
  public watchFile(
    filePath: string,
    basePath: string,
    callback: FileWatchCallback,
  ): () => void {
    console.log(
      `[ClientFileWatcher] Starting to watch file: ${filePath} (base: ${basePath})`,
    );

    const watchKey = `${basePath}:${filePath}`;

    // Check if watcher already exists
    let config = this.watchers.get(watchKey);

    if (config) {
      // Watcher already exists, just add callback
      config.callbacks.add(callback);
      console.log(
        `[ClientFileWatcher] Added callback to existing watcher for: ${filePath}`,
      );
    } else {
      // Create new watcher
      try {
        // Create EventSource connection to SSE API
        const url = new URL("/api/file/watch", window.location.origin);
        url.searchParams.set("path", filePath);
        url.searchParams.set("basePath", basePath);

        const eventSource = new EventSource(url.toString());

        const callbacks = new Set<FileWatchCallback>();
        callbacks.add(callback);

        config = {
          eventSource,
          filePath,
          basePath,
          callbacks,
          lastSeenPath: filePath,
        };

        this.watchers.set(watchKey, config);
        this.setupSSEEvents(config);

        console.log(
          `[ClientFileWatcher] Created new SSE watcher for: ${filePath}`,
        );
      } catch (error) {
        console.error(
          `[ClientFileWatcher] Failed to create watcher for ${filePath}:`,
          error,
        );
        callback({
          event: "error",
          filePath,
          error:
            error instanceof Error
              ? error
              : new Error("Failed to create watcher"),
        });
      }
    }

    // Return cleanup function
    return () => {
      this.removeCallback(watchKey, callback);
    };
  }

  /**
   * Stop watching specified file (remove all callbacks)
   * @param watchKey - Watch key
   */
  public unwatchFile(watchKey: string): void {
    const config = this.watchers.get(watchKey);
    if (config) {
      console.log(`[ClientFileWatcher] Stopping watch for: ${watchKey}`);
      config.eventSource.close();
      this.watchers.delete(watchKey);

      // Cleanup any pending move detection
      this.cleanupPendingMove(config.filePath);
    }
  }

  /**
   * Remove specified callback function, stop watching if no other callbacks
   * @param watchKey - Watch key
   * @param callback - Callback function to remove
   */
  private removeCallback(watchKey: string, callback: FileWatchCallback): void {
    const config = this.watchers.get(watchKey);
    if (!config) return;

    config.callbacks.delete(callback);

    // Stop watching if no other callbacks remain
    if (config.callbacks.size === 0) {
      console.log(
        `[ClientFileWatcher] No more callbacks, stopping watch for: ${watchKey}`,
      );
      this.unwatchFile(watchKey);
    }
  }

  /**
   * Setup SSE event handling
   * @param config - Watcher configuration
   */
  private setupSSEEvents(config: WatcherConfig): void {
    const { eventSource, filePath, callbacks } = config;

    // Handle received SSE messages
    eventSource.onmessage = (event) => {
      try {
        const message: SSEMessage = JSON.parse(event.data);
        console.log(`[ClientFileWatcher] SSE message received:`, message);

        switch (message.type) {
          case "connected":
            console.log(`[ClientFileWatcher] SSE connected for: ${filePath}`);
            break;

          case "change":
            console.log(`[ClientFileWatcher] File changed: ${filePath}`);
            this.notifyCallbacks(callbacks, {
              event: "change",
              filePath,
            });
            break;

          case "unlink":
            console.log(`[ClientFileWatcher] File unlinked: ${filePath}`);

            // Setup delayed detection to distinguish between delete and move
            this.pendingMoves.set(filePath, {
              path: filePath,
              timer: setTimeout(() => {
                // Confirm actual deletion after delay
                console.log(
                  `[ClientFileWatcher] File confirmed deleted: ${filePath}`,
                );
                this.notifyCallbacks(callbacks, {
                  event: "unlink",
                  filePath,
                  file: null,
                });
                this.cleanupPendingMove(filePath);
              }, 500), // 500ms delay for move detection
            });
            break;

          case "add":
            console.log(`[ClientFileWatcher] File added: ${message.filePath}`);

            // Check if this is result of a move operation
            const pendingMove = this.pendingMoves.get(filePath);
            if (pendingMove && message.filePath !== filePath) {
              // Detected a move
              console.log(
                `[ClientFileWatcher] File moved: ${filePath} -> ${message.filePath}`,
              );
              this.cleanupPendingMove(filePath);

              this.notifyCallbacks(callbacks, {
                event: "move",
                filePath,
                newPath: message.filePath,
              });

              // Update watched path
              config.lastSeenPath = message.filePath;
            } else {
              // Normal file addition (recreated)
              this.notifyCallbacks(callbacks, {
                event: "add",
                filePath: message.filePath || filePath,
              });
            }
            break;

          case "error":
            console.error(
              `[ClientFileWatcher] SSE error for ${filePath}:`,
              message.error,
            );
            this.notifyCallbacks(callbacks, {
              event: "error",
              filePath,
              error: new Error(message.error || "Unknown SSE error"),
            });
            break;

          case "heartbeat":
            // Heartbeat message, no special handling required
            break;
        }
      } catch (error) {
        console.error("[ClientFileWatcher] Error parsing SSE message:", error);
      }
    };

    // SSE connection error handling
    eventSource.onerror = () => {
      // Only log detailed errors in development to avoid production noise
      if (process.env.NODE_ENV === "development") {
        console.warn(`[ClientFileWatcher] SSE connection lost for ${filePath}`);
      }
    };

    // SSE connection opened event
    eventSource.onopen = () => {
      console.log(`[ClientFileWatcher] SSE connection opened for: ${filePath}`);
    };
  }

  /**
   * Notify all callback functions
   * @param callbacks - Callback function set
   * @param data - Event data
   */
  private notifyCallbacks(
    callbacks: Set<FileWatchCallback>,
    data: FileWatchEventData,
  ): void {
    callbacks.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error("[ClientFileWatcher] Callback error:", error);
      }
    });
  }

  /**
   * Cleanup pending move detection
   * @param filePath - File path
   */
  private cleanupPendingMove(filePath: string): void {
    const pending = this.pendingMoves.get(filePath);
    if (pending) {
      clearTimeout(pending.timer);
      this.pendingMoves.delete(filePath);
    }
  }

  /**
   * Get list of currently watched files
   * @returns Array of watched file paths
   */
  public getWatchedFiles(): string[] {
    return Array.from(this.watchers.keys());
  }

  /**
   * Cleanup all watchers
   */
  public cleanup(): void {
    console.log("[ClientFileWatcher] Cleaning up all watchers...");

    // Cleanup all watchers
    this.watchers.forEach((config, _watchKey) => {
      config.eventSource.close();
    });
    this.watchers.clear();

    // Cleanup pending move detections
    this.pendingMoves.forEach((pending) => {
      clearTimeout(pending.timer);
    });
    this.pendingMoves.clear();

    console.log("[ClientFileWatcher] All watchers cleaned up");
  }
}

// Create singleton instance
const clientFileWatcher = new ClientFileWatcher();

export default clientFileWatcher;
