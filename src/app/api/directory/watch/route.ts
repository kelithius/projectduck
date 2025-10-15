/**
 * Directory Watch SSE API
 *
 * Provides Server-Sent Events for real-time directory change notifications to clients
 * Includes file/folder add, delete, rename, and move operations
 */
import { NextRequest, NextResponse } from "next/server";
import chokidar, { type FSWatcher } from "chokidar";
import { existsSync, statSync } from "fs";
import path from "path";

// Store active watchers and client connections
const activeWatchers = new Map<string, FSWatcher>();
const clientConnections = new Map<string, ReadableStreamDefaultController>();

// Directory watch event types
export interface DirectoryWatchEvent {
  type:
    | "connected"
    | "add"
    | "addDir"
    | "change"
    | "unlink"
    | "unlinkDir"
    | "error"
    | "heartbeat";
  path?: string;
  relativePath?: string;
  stats?: {
    isFile: boolean;
    isDirectory: boolean;
    size?: number;
    modified?: string;
  };
  error?: string;
  timestamp: number;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetPath = searchParams.get("path") || "";
  const basePath = searchParams.get("basePath");
  const recursive = searchParams.get("recursive") !== "false"; // Default to true

  if (!basePath) {
    return NextResponse.json(
      { success: false, error: "Missing required parameter: basePath" },
      { status: 400 },
    );
  }

  try {
    // Construct full path
    const fullPath = path.isAbsolute(targetPath)
      ? targetPath
      : path.join(basePath, targetPath);

    // Check if directory exists
    if (!existsSync(fullPath)) {
      return NextResponse.json(
        { success: false, error: "Directory not found" },
        { status: 404 },
      );
    }

    const stats = statSync(fullPath);
    if (!stats.isDirectory()) {
      return NextResponse.json(
        { success: false, error: "Path is not a directory" },
        { status: 400 },
      );
    }

    console.log("[DirectoryWatch SSE] Starting directory watch for:", fullPath);

    // Create SSE stream
    const stream = new ReadableStream({
      start(controller) {
        const watcherId = Math.random().toString(36).substr(2, 9);
        clientConnections.set(watcherId, controller);

        // Initialize connection
        const connectEvent: DirectoryWatchEvent = {
          type: "connected",
          path: fullPath,
          timestamp: Date.now(),
        };

        controller.enqueue(`data: ${JSON.stringify(connectEvent)}\n\n`);

        // Create chokidar watcher
        const watchPath = recursive ? fullPath : path.join(fullPath, "*");
        const watcher = chokidar.watch(watchPath, {
          persistent: true,
          ignoreInitial: true,
          atomic: true,
          awaitWriteFinish: {
            stabilityThreshold: 100,
            pollInterval: 50,
          },
          depth: recursive ? undefined : 1, // Control recursion depth
          followSymlinks: false,
          alwaysStat: true, // Provide file statistics
        });

        // File add event
        watcher.on("add", (addedPath: string, stats?: unknown) => {
          const relativePath = path.relative(fullPath, addedPath);
          console.log("[DirectoryWatch SSE] File added:", relativePath);

          const fileStats = stats as
            | { size?: number; mtime?: Date }
            | undefined;
          const event: DirectoryWatchEvent = {
            type: "add",
            path: addedPath,
            relativePath,
            stats: {
              isFile: true,
              isDirectory: false,
              size: fileStats?.size,
              modified: fileStats?.mtime?.toISOString(),
            },
            timestamp: Date.now(),
          };

          controller.enqueue(`data: ${JSON.stringify(event)}\n\n`);
        });

        // Directory add event
        watcher.on("addDir", (addedPath: string, stats?: unknown) => {
          const relativePath = path.relative(fullPath, addedPath);
          // Ignore root directory itself
          if (relativePath === "") return;

          console.log("[DirectoryWatch SSE] Directory added:", relativePath);

          const fileStats = stats as { mtime?: Date } | undefined;
          const event: DirectoryWatchEvent = {
            type: "addDir",
            path: addedPath,
            relativePath,
            stats: {
              isFile: false,
              isDirectory: true,
              modified: fileStats?.mtime?.toISOString(),
            },
            timestamp: Date.now(),
          };

          controller.enqueue(`data: ${JSON.stringify(event)}\n\n`);
        });

        // File change event
        watcher.on("change", (changedPath: string, stats?: unknown) => {
          const relativePath = path.relative(fullPath, changedPath);
          console.log("[DirectoryWatch SSE] File changed:", relativePath);

          const fileStats = stats as
            | { size?: number; mtime?: Date }
            | undefined;
          const event: DirectoryWatchEvent = {
            type: "change",
            path: changedPath,
            relativePath,
            stats: {
              isFile: true,
              isDirectory: false,
              size: fileStats?.size,
              modified: fileStats?.mtime?.toISOString(),
            },
            timestamp: Date.now(),
          };

          controller.enqueue(`data: ${JSON.stringify(event)}\n\n`);
        });

        // File delete event
        watcher.on("unlink", (removedPath: string) => {
          const relativePath = path.relative(fullPath, removedPath);
          console.log("[DirectoryWatch SSE] File deleted:", relativePath);

          const event: DirectoryWatchEvent = {
            type: "unlink",
            path: removedPath,
            relativePath,
            stats: {
              isFile: true,
              isDirectory: false,
            },
            timestamp: Date.now(),
          };

          controller.enqueue(`data: ${JSON.stringify(event)}\n\n`);
        });

        // Directory delete event
        watcher.on("unlinkDir", (removedPath: string) => {
          const relativePath = path.relative(fullPath, removedPath);
          console.log("[DirectoryWatch SSE] Directory deleted:", relativePath);

          const event: DirectoryWatchEvent = {
            type: "unlinkDir",
            path: removedPath,
            relativePath,
            stats: {
              isFile: false,
              isDirectory: true,
            },
            timestamp: Date.now(),
          };

          controller.enqueue(`data: ${JSON.stringify(event)}\n\n`);
        });

        // Watcher error
        watcher.on("error", (err: unknown) => {
          const error = err instanceof Error ? err : new Error(String(err));
          console.error("[DirectoryWatch SSE] Watcher error:", error);

          const event: DirectoryWatchEvent = {
            type: "error",
            path: fullPath,
            error: error.message,
            timestamp: Date.now(),
          };

          controller.enqueue(`data: ${JSON.stringify(event)}\n\n`);
        });

        activeWatchers.set(watcherId, watcher);

        // Handle connection close
        const cleanup = () => {
          console.log("[DirectoryWatch SSE] Cleaning up watcher:", watcherId);
          watcher.close();
          activeWatchers.delete(watcherId);
          clientConnections.delete(watcherId);
        };

        // Listen for connection close
        request.signal?.addEventListener("abort", cleanup);

        // Setup periodic heartbeat check
        const heartbeat = setInterval(() => {
          try {
            const heartbeatEvent: DirectoryWatchEvent = {
              type: "heartbeat",
              timestamp: Date.now(),
            };

            controller.enqueue(`data: ${JSON.stringify(heartbeatEvent)}\n\n`);
          } catch (_error) {
            console.log(
              "[DirectoryWatch SSE] Client disconnected, cleaning up",
            );
            clearInterval(heartbeat);
            cleanup();
          }
        }, 30000); // 30 second heartbeat
      },

      cancel() {
        console.log("[DirectoryWatch SSE] Stream cancelled");
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Cache-Control",
      },
    });
  } catch (error) {
    console.error(
      "[DirectoryWatch SSE] Error setting up directory watch:",
      error,
    );
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Utility function to clean up all watchers
function cleanupAllDirectoryWatchers() {
  console.log("[DirectoryWatch SSE] Cleaning up all directory watchers...");

  for (const [id, watcher] of activeWatchers) {
    try {
      watcher.close();
    } catch (error) {
      console.error("[DirectoryWatch SSE] Error closing watcher:", id, error);
    }
  }

  activeWatchers.clear();
  clientConnections.clear();
}

// Handle cleanup on process exit
if (typeof process !== "undefined") {
  process.on("SIGINT", cleanupAllDirectoryWatchers);
  process.on("SIGTERM", cleanupAllDirectoryWatchers);
  process.on("exit", cleanupAllDirectoryWatchers);
}
