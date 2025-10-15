import { NextRequest } from "next/server";
import { claudeSDKService } from "@/lib/services/claude/claudeSDKService";

// GET: Get system status and statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientSessionId = searchParams.get("clientSessionId");

    // Get Claude Code availability
    const availability = await claudeSDKService.checkClaudeAvailability();

    // Get statistics
    const stats = claudeSDKService.getStats();

    const response = {
      success: true,
      data: {
        architecture: "simplified",
        claudeAvailable: availability.available,
        claudeError: availability.error,
        clientSessionId: clientSessionId || null,
        sessionModel: "tab-isolated", // Each tab is isolated
        stats: {
          runningQueries: stats.runningQueries,
          queryIds: stats.queryIds,
        },
        features: {
          sessionPersistence: false, // No persistence
          sessionResume: true, // Use Claude SDK resume
          sessionIsolation: true, // Complete isolation
          autoCleanup: false, // No cleanup needed
        },
      },
    };

    return new Response(JSON.stringify(response), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[Status API] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Failed to get status",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

// POST: Initialize or validate client session (optional)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientSessionId } = body;

    if (!clientSessionId?.trim()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Client session ID is required",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    console.log("[Status API] Client session initialized:", clientSessionId);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          clientSessionId,
          message: "Session registered (no server-side state maintained)",
          architecture: "simplified",
        },
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[Status API] Initialization error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to initialize session",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
