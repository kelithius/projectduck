import { NextRequest } from "next/server";

// Simplified session API - redirect to new status API
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clientSessionId =
    searchParams.get("clientSessionId") || searchParams.get("browserSessionId"); // Backward compatibility

  // Redirect to new status API
  const statusUrl = new URL("/api/claude/status", request.url);
  if (clientSessionId) {
    statusUrl.searchParams.set("clientSessionId", clientSessionId);
  }

  console.log("[Session API] Redirecting to status API:", statusUrl.pathname);

  return Response.redirect(statusUrl.toString(), 302);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectPath, clientSessionId, browserSessionId } = body;

    // Backward compatibility: support browserSessionId
    const sessionId = clientSessionId || browserSessionId;

    console.log(
      "[Session API] Session creation requested (simplified architecture)",
    );
    console.log("[Session API] Project:", projectPath);
    console.log("[Session API] Session ID:", sessionId);

    // In the new architecture, sessions are automatically created and do not require manual creation
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          sessionId: sessionId || "auto-generated",
          projectPath,
          isActive: true,
          messageCount: 0,
          architecture: "simplified",
          note: "Sessions are now automatically managed by Claude Code SDK",
        },
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[Session API] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

export async function DELETE(request: NextRequest) {
  // Redirect to clear API
  const url = new URL(request.url);
  const clearUrl = new URL("/api/claude/session/clear", url.origin);
  clearUrl.search = url.search; // Preserve query parameters

  console.log("[Session API] Redirecting delete to clear API");

  return Response.redirect(clearUrl.toString(), 302);
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectPath,
      clientSessionId,
      browserSessionId,
      permissionMode,
      options,
    } = body;

    // Backward compatibility: support browserSessionId
    const sessionId = clientSessionId || browserSessionId;

    console.log(
      "[Session API] Session update requested (simplified architecture)",
    );
    console.log("[Session API] Session ID:", sessionId);
    console.log("[Session API] Permission mode:", permissionMode);

    // In the new architecture, options are passed directly to the SDK on each query
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          sessionId: sessionId || "auto-managed",
          projectPath,
          isActive: true,
          options: options || {},
          architecture: "simplified",
          note: "Options are now passed directly to Claude SDK in each query",
        },
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[Session API] Update error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update session",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
