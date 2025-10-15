import { claudeSDKService } from "@/lib/services/claude/claudeSDKService";

export async function GET() {
  try {
    const availability = await claudeSDKService.checkClaudeAvailability();

    return new Response(
      JSON.stringify({
        authenticated: availability.available,
        error: availability.error,
        supportedTools: claudeSDKService.getSupportedTools(),
        supportedPermissionModes:
          claudeSDKService.getSupportedPermissionModes(),
        stats: claudeSDKService.getStats(),
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Auth check error:", error);
    return new Response(
      JSON.stringify({
        authenticated: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to check authentication",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

export async function POST() {
  try {
    // Claude Code SDK handles authentication automatically, here we mainly recheck status
    const availability = await claudeSDKService.checkClaudeAvailability();

    if (availability.available) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Claude Code is available and ready to use",
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    } else {
      const isVertexMode = process.env.CLAUDE_CODE_USE_VERTEX === "1";

      return new Response(
        JSON.stringify({
          success: false,
          error: "Claude Code authentication required",
          mode: isVertexMode ? "vertex" : "standard",
          instructions: isVertexMode
            ? [
                "1. Ensure GOOGLE_APPLICATION_CREDENTIALS is set to your service account key path",
                "2. Ensure ANTHROPIC_VERTEX_PROJECT_ID is set to your GCP project ID",
                "3. Ensure CLAUDE_CODE_USE_VERTEX=1 is set",
                "4. Verify your service account has Vertex AI access",
                "5. Refresh this page",
              ]
            : [
                "1. Open your terminal",
                "2. Run: claude login",
                "3. Follow the authentication process",
                "4. Refresh this page",
                "5. Alternative: Set up API key in Claude Code settings",
              ],
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  } catch (error) {
    console.error("Auth POST error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Authentication check failed",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
