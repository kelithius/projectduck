/**
 * 檔案監控 SSE API
 *
 * 提供 Server-Sent Events 來即時通知客戶端檔案變更
 */
import { NextRequest, NextResponse } from "next/server";
import chokidar, { type FSWatcher } from "chokidar";
import { existsSync } from "fs";
import path from "path";

// 儲存活躍的監控器
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
    // 建構完整路徑
    const fullPath = path.isAbsolute(filePath)
      ? filePath
      : path.join(basePath, filePath);

    // 檢查檔案是否存在
    if (!existsSync(fullPath)) {
      return NextResponse.json(
        { success: false, error: "File not found" },
        { status: 404 },
      );
    }

    console.log("[FileWatch SSE] Starting file watch for:", fullPath);

    // 建立 SSE 串流
    const stream = new ReadableStream({
      start(controller) {
        const watcherId = Math.random().toString(36).substr(2, 9);
        clientConnections.set(watcherId, controller);

        // 初始化連接
        controller.enqueue(
          `data: ${JSON.stringify({
            type: "connected",
            filePath: fullPath,
            timestamp: Date.now(),
          })}\n\n`,
        );

        // 開始監控檔案
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

        // 檔案變更事件
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

        // 檔案刪除事件
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

        // 檔案新增事件（重新建立）
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

        // 監控錯誤
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

        // 處理連接關閉
        const cleanup = () => {
          console.log("[FileWatch SSE] Cleaning up watcher:", watcherId);
          watcher.close();
          activeWatchers.delete(watcherId);
          clientConnections.delete(watcherId);
        };

        // 監聽連接關閉
        request.signal?.addEventListener("abort", cleanup);

        // 設置定時心跳檢測（可選）
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
        }, 30000); // 30秒心跳
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

// 清理所有監控器的工具函數（用於程序退出時）
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

// 處理程序退出時的清理
if (typeof process !== "undefined") {
  process.on("SIGINT", cleanupAllWatchers);
  process.on("SIGTERM", cleanupAllWatchers);
  process.on("exit", cleanupAllWatchers);
}
