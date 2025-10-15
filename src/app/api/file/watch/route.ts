/**
 * File Watch SSE API
 *
 * Provides Server-Sent Events for real-time file change notifications to clients
 */
import { NextRequest, NextResponse } from "next/server";
import chokidar, { type FSWatcher } from "chokidar";
import { existsSync } from "fs";
import path from "path";

// Store active watchers
const activeWatchers = new Map<string, FSWatcher>();
const clientConnections = new Map<string, ReadableStreamDefaultController>();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const filePath = searchParams.get("path");
  const basePath = searchParams.get("basePath");

  if (!filePath || !basePath) {
    return NextResponse.json(
      {
        success: false,
        error: "Missing required parameters: path or basePath",
      },
      { status: 400 },
    );
  }

  try {
    // Construct full path
    const fullPath = path.isAbsolute(filePath)
      ? filePath
      : path.join(basePath, filePath);

    // Check if file exists
    if (!existsSync(fullPath)) {
      return NextResponse.json(
        { success: false, error: "File not found" },
        { status: 404 },
      );
    }

    console.log("[FileWatch SSE] Starting file watch for:", fullPath);

    // Create SSE stream
    const stream = new ReadableStream({
      start(controller) {
        const watcherId = Math.random().toString(36).substr(2, 9);
        clientConnections.set(watcherId, controller);

        // Initialize connection
        controller.enqueue(
          `data: ${JSON.stringify({
            type: "connected",
            filePath: fullPath,
            timestamp: Date.now(),
          })}\n\n`,
        );

        // Start watching file
        const watcher = chokidar.watch(fullPath, {
          persistent: true,
          ignoreInitial: true,
          atomic: true,
          awaitWriteFinish: {
            stabilityThreshold: 100,
            pollInterval: 50,
          },
          followSymlinks: false,
        });

        // File change event
        watcher.on("change", () => {
          console.log("[FileWatch SSE] File changed:", fullPath);
          controller.enqueue(
            `data: ${JSON.stringify({
              type: "change",
              filePath: fullPath,
              timestamp: Date.now(),
            })}\n\n`,
          );
        });

        // File delete event
        watcher.on("unlink", () => {
          console.log("[FileWatch SSE] File deleted:", fullPath);
          controller.enqueue(
            `data: ${JSON.stringify({
              type: "unlink",
              filePath: fullPath,
              timestamp: Date.now(),
            })}\n\n`,
          );
        });

        // File add event (recreated)
        watcher.on("add", (path: string) => {
          console.log("[FileWatch SSE] File added:", path);
          controller.enqueue(
            `data: ${JSON.stringify({
              type: "add",
              filePath: path,
              timestamp: Date.now(),
            })}\n\n`,
          );
        });

        // Watcher error
        watcher.on("error", (err: unknown) => {
          const error = err instanceof Error ? err : new Error(String(err));
          console.error("[FileWatch SSE] Watcher error:", error);
          controller.enqueue(
            `data: ${JSON.stringify({
              type: "error",
              filePath: fullPath,
              error: error.message,
              timestamp: Date.now(),
            })}\n\n`,
          );
        });

        activeWatchers.set(watcherId, watcher);

        // Handle connection close
        const cleanup = () => {
          console.log("[FileWatch SSE] Cleaning up watcher:", watcherId);
          watcher.close();
          activeWatchers.delete(watcherId);
          clientConnections.delete(watcherId);
        };

        // Listen for connection close
        request.signal?.addEventListener("abort", cleanup);

        // Setup periodic heartbeat check (optional)
        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(
              `data: ${JSON.stringify({
                type: "heartbeat",
                timestamp: Date.now(),
              })}\n\n`,
            );
          } catch (_error) {
            console.log("[FileWatch SSE] Client disconnected, cleaning up");
            clearInterval(heartbeat);
            cleanup();
          }
        }, 30000); // 30 second heartbeat
      },

      cancel() {
        console.log("[FileWatch SSE] Stream cancelled");
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
    console.error("[FileWatch SSE] Error setting up file watch:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Utility function to clean up all watchers (for process exit)
function cleanupAllWatchers() {
  console.log("[FileWatch SSE] Cleaning up all watchers...");

  for (const [id, watcher] of activeWatchers) {
    try {
      watcher.close();
    } catch (error) {
      console.error("[FileWatch SSE] Error closing watcher:", id, error);
    }
  }

  activeWatchers.clear();
  clientConnections.clear();
}

// Handle cleanup on process exit
if (typeof process !== "undefined") {
  process.on("SIGINT", cleanupAllWatchers);
  process.on("SIGTERM", cleanupAllWatchers);
  process.on("exit", cleanupAllWatchers);
}
