import { NextRequest } from "next/server";

// In the new minimalist architecture, session clearing is not needed
// Each tab/reload automatically creates a new session
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectPath = searchParams.get("projectPath");
    const clientSessionId = searchParams.get("clientSessionId");

    console.log("[Clear Session API] Called with simplified architecture");
    console.log("[Clear Session API] Project:", projectPath);
    console.log("[Clear Session API] Client Session ID:", clientSessionId);
    console.log(
      "[Clear Session API] No action needed - sessions are automatically isolated",
    );

    // In the new architecture, each tab is isolated and does not need clearing
    return new Response(
      JSON.stringify({
        success: true,
        message: "Session isolation is automatic in new architecture",
      }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[Clear Session API] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to process request",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
