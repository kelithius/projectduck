import { NextRequest } from "next/server";
import { claudeSDKService } from "@/lib/services/claude/claudeSDKService";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const message = formData.get("message") as string;
    const projectPath = formData.get("projectPath") as string;
    const claudeSessionId = formData.get("clientSessionId") as string; // Backward compatibility: frontend still uses clientSessionId

    if (!message?.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: "Message is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (!projectPath?.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: "Project path is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Handle attachments
    const attachmentCount = parseInt(
      (formData.get("attachmentCount") as string) || "0",
    );
    const attachments: File[] = [];

    for (let i = 0; i < attachmentCount; i++) {
      const file = formData.get(`attachment_${i}`) as File;
      if (file) {
        attachments.push(file);
      }
    }

    console.log("[Query API] Processing request:", {
      claudeSessionId: claudeSessionId || "new-session",
      projectPath,
      messageLength: message.length,
      attachmentCount: attachments.length,
    });

    // Start query
    const result = await claudeSDKService.startQuery({
      prompt: message,
      projectPath,
      claudeSessionId: claudeSessionId || undefined, // If none, create new session
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    if (!result.success || !result.queryGenerator) {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error || "Failed to start query",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Setup SSE headers
    const headers = {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Create SSE stream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let actualSessionId = claudeSessionId || "new-session";

        try {
          // Send start event
          controller.enqueue(
            encoder.encode(
              `event: start\ndata: ${JSON.stringify({
                message: "Query started",
                claudeSessionId: actualSessionId,
              })}\n\n`,
            ),
          );

          // Process SDK messages
          if (result.queryGenerator) {
            for await (const sdkMessage of claudeSDKService.processQuery(
              result.queryGenerator,
              claudeSessionId,
              (sessionId: string) => {
                // When receiving actual Claude session ID, update and report to frontend
                actualSessionId = sessionId;
                console.log(
                  "[Query API] Received Claude session ID:",
                  sessionId,
                );

                // Send session ID event to frontend
                controller.enqueue(
                  encoder.encode(
                    `event: session\ndata: ${JSON.stringify({
                      claudeSessionId: sessionId,
                    })}\n\n`,
                  ),
                );
              },
            )) {
              // Convert SDK message to frontend format
              const eventData = {
                type: sdkMessage.type,
                data: sdkMessage,
              };

              controller.enqueue(
                encoder.encode(
                  `event: message\ndata: ${JSON.stringify(eventData)}\n\n`,
                ),
              );
            }
          }

          // Send complete event
          controller.enqueue(
            encoder.encode(
              `event: complete\ndata: ${JSON.stringify({
                message: "Query completed successfully",
              })}\n\n`,
            ),
          );
        } catch (error) {
          console.error("[Query API] Stream error:", error);

          // Send error event
          controller.enqueue(
            encoder.encode(
              `event: error\ndata: ${JSON.stringify({
                error: error instanceof Error ? error.message : "Unknown error",
              })}\n\n`,
            ),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, { headers });
  } catch (error) {
    console.error("[Query API] Request error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

// Interrupt query
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const claudeSessionId = searchParams.get("clientSessionId"); // Backward compatibility: frontend still uses clientSessionId

    if (!claudeSessionId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Claude session ID is required",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const success = await claudeSDKService.interruptQuery(claudeSessionId);

    return new Response(
      JSON.stringify({
        success,
        message: success
          ? "Query interrupted"
          : "Query not found or already completed",
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[Query API] Interrupt error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to interrupt query",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
