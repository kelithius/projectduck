/**
 * DirectoryWatcher - Directory change monitoring service (client-side version)
 *
 * Features:
 * - Monitor file change events in directories and subdirectories via SSE
 * - Provide callback mechanism for directory changes
 * - Support registration and management of multiple callback functions
 * - Automatic cleanup of unused watchers to prevent memory leaks
 * - Support both recursive and non-recursive monitoring modes
 */

import {
  DirectoryWatchEvent,
  DirectoryWatchCallback,
  DirectoryWatcherConfig,
} from "@/lib/types";

/**
 * Internal watcher configuration structure
 */
interface WatcherConfig {
  eventSource: EventSource;
  basePath: string;
  targetPath: string;
  recursive: boolean;
  callbacks: Set<DirectoryWatchCallback>;
}

/**
 * DirectoryWatcher class
 */
class DirectoryWatcher {
  private watchers: Map<string, WatcherConfig> = new Map();

  /**
   * Start watching a specified directory
   * @param config Watcher configuration
   * @returns Cleanup function to cancel watching
   */
  public watchDirectory(config: DirectoryWatcherConfig): () => void {
    const { basePath, targetPath, recursive, callback } = config;
    const watchKey = `${basePath}:${targetPath}:${recursive}`;

    console.log(
      `[DirectoryWatcher] Starting to watch directory: ${targetPath} (base: ${basePath}, recursive: ${recursive})`,
    );

    // Check if a watcher already exists
    let watcherConfig = this.watchers.get(watchKey);

    if (watcherConfig) {
      // Watcher already exists, just add the callback
      watcherConfig.callbacks.add(callback);
      console.log(
        `[DirectoryWatcher] Added callback to existing watcher for: ${targetPath}`,
      );
    } else {
      // Create a new watcher
      try {
        // Create EventSource connection to SSE API
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

    // Return cleanup function
    return () => {
      this.removeCallback(watchKey, callback);
    };
  }

  /**
   * Stop watching a specified directory (remove all callbacks)
   * @param watchKey Watch key identifier
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
   * Remove a specified callback function, stop watching if no other callbacks remain
   * @param watchKey Watch key identifier
   * @param callback Callback function to remove
   */
  private removeCallback(
    watchKey: string,
    callback: DirectoryWatchCallback,
  ): void {
    const config = this.watchers.get(watchKey);
    if (!config) return;

    config.callbacks.delete(callback);

    // If no other callbacks remain, stop watching
    if (config.callbacks.size === 0) {
      console.log(
        `[DirectoryWatcher] No more callbacks, stopping watch for: ${watchKey}`,
      );
      this.unwatchDirectory(watchKey);
    }
  }

  /**
   * Set up SSE event handlers
   * @param config Watcher configuration
   */
  private setupSSEEvents(config: WatcherConfig): void {
    const { eventSource, targetPath, callbacks } = config;

    // Handle received SSE messages
    eventSource.onmessage = (event) => {
      try {
        const message: DirectoryWatchEvent = JSON.parse(event.data);
        console.log(`[DirectoryWatcher] SSE message received:`, message);

        // Filter out heartbeat messages
        if (message.type === "heartbeat") {
          return;
        }

        // Notify all callbacks
        console.log(
          `[DirectoryWatcher] Notifying ${callbacks.size} callbacks for event:`,
          message,
        );
        this.notifyCallbacks(callbacks, message);
      } catch (error) {
        console.error("[DirectoryWatcher] Error parsing SSE message:", error);
      }
    };

    // SSE connection error handling
    eventSource.onerror = (error) => {
      console.warn(
        `[DirectoryWatcher] SSE connection issue for ${targetPath}:`,
        error,
      );

      // Notify error
      this.notifyCallbacks(callbacks, {
        type: "error",
        path: targetPath,
        error: "SSE connection lost",
        timestamp: Date.now(),
      });
    };

    // SSE connection opened event
    eventSource.onopen = () => {
      console.log(
        `[DirectoryWatcher] SSE connection opened for: ${targetPath}`,
      );
    };
  }

  /**
   * Notify all callback functions
   * @param callbacks Set of callback functions
   * @param event Directory change event
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
   * Get list of currently watched directories
   * @returns List of directories being watched
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
   * Check if a specified directory is being watched
   * @param basePath Base path
   * @param targetPath Target path
   * @param recursive Whether recursive
   * @returns Whether the directory is being watched
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
   * Clean up all watchers
   */
  public cleanup(): void {
    console.log("[DirectoryWatcher] Cleaning up all watchers...");

    // Clean up all watchers
    this.watchers.forEach((config, _watchKey) => {
      config.eventSource.close();
    });
    this.watchers.clear();

    console.log("[DirectoryWatcher] All watchers cleaned up");
  }

  /**
   * Reconnect all watchers (for use after network recovery)
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

    // Clean up existing connections
    this.cleanup();

    // Re-establish connections
    currentConfigs.forEach(({ basePath, targetPath, recursive, callbacks }) => {
      callbacks.forEach((callback) => {
        this.watchDirectory({ basePath, targetPath, recursive, callback });
      });
    });
  }
}

// Create singleton instance
const directoryWatcher = new DirectoryWatcher();

export default directoryWatcher;
