import { v4 as uuidv4 } from "uuid";
import { Message, SendMessageOptions, FileAttachment } from "@/lib/types/chat";
import { appConfig } from "@/lib/services/appConfigService";

export interface ClaudeCodeResponse {
  success: boolean;
  data?: {
    message?: string;
    stream?: ReadableStream<Uint8Array>;
  };
  error?: string;
}

// Event type definition
export interface StreamEvent {
  type: "start" | "message" | "complete" | "error" | "session";
  data: unknown;
}

class ClaudeCodeService {
  private authenticated: boolean = false;
  private abortController: AbortController | null = null;

  constructor() {
    console.log(
      "[ClaudeCodeService] Initialized with new Claude-managed session architecture",
    );
  }

  // In the new minimalist architecture, session clearing is not needed as each tab is independent
  async clearSession(_projectPath: string): Promise<boolean> {
    console.log(
      "[ClaudeCodeService] Clear session called, but not needed in new architecture",
    );
    console.log(
      "[ClaudeCodeService] Each tab/reload creates a new independent session",
    );
    return true; // Always succeeds because no action is needed
  }

  async checkAuthentication(): Promise<boolean> {
    try {
      const response = await fetch("/api/claude/auth", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();
      this.authenticated = result.authenticated || false;
      return this.authenticated;
    } catch (error) {
      console.error("[ClaudeCodeService] Authentication check failed:", {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });
      this.authenticated = false;
      return false;
    }
  }

  async authenticate(): Promise<boolean> {
    try {
      const response = await fetch("/api/claude/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();
      this.authenticated = result.success || false;
      return this.authenticated;
    } catch (error) {
      console.error("Authentication failed:", error);
      this.authenticated = false;
      return false;
    }
  }

  // In the new architecture, projectPath is passed directly in each request without global state
  // async setWorkingDirectory is no longer needed

  async sendMessage(
    options: SendMessageOptions,
    claudeSessionId?: string | null,
  ): Promise<ClaudeCodeResponse> {
    const { content, attachments, projectPath } = options;

    try {
      // Prepare request data - using the new minimalist API
      const formData = new FormData();
      formData.append("message", content);
      if (claudeSessionId) {
        formData.append("clientSessionId", claudeSessionId); // Backward compatibility: API still expects clientSessionId
      }

      if (projectPath) {
        formData.append("projectPath", projectPath);
      }

      // Handle attachments
      if (attachments && attachments.length > 0) {
        attachments.forEach((file, index) => {
          formData.append(`attachment_${index}`, file);
        });
        formData.append("attachmentCount", attachments.length.toString());
      }

      // Create new AbortController
      this.abortController = new AbortController();

      // Use the new minimalist query API
      const response = await fetch("/api/claude/query", {
        method: "POST",
        body: formData,
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      // The new API returns Server-Sent Events
      return {
        success: true,
        data: {
          stream: response.body || undefined,
        },
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return {
          success: false,
          error: "Request was cancelled",
        };
      }

      console.error("[ClaudeCodeService] Send message failed:", {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        claudeSessionId: claudeSessionId,
        timestamp: new Date().toISOString(),
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Add SSE event stream processing method
  async sendMessageWithSSE(
    options: SendMessageOptions,
    onEvent: (event: StreamEvent) => void,
    claudeSessionId?: string | null,
  ): Promise<void> {
    const { content, attachments, projectPath } = options;

    try {
      // Prepare request data - using the new minimalist API
      const formData = new FormData();
      formData.append("message", content);
      if (claudeSessionId) {
        formData.append("clientSessionId", claudeSessionId); // Backward compatibility: API still expects clientSessionId
      }

      if (projectPath) {
        formData.append("projectPath", projectPath);
      }

      // Handle attachments
      if (attachments && attachments.length > 0) {
        attachments.forEach((file, index) => {
          formData.append(`attachment_${index}`, file);
        });
        formData.append("attachmentCount", attachments.length.toString());
      }

      // Create new AbortController
      this.abortController = new AbortController();

      // Use the new minimalist query API
      const response = await fetch("/api/claude/query", {
        method: "POST",
        body: formData,
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      // Handle Server-Sent Events
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body available");
      }

      try {
        let buffer = "";
        const MAX_BUFFER_SIZE = appConfig.getSSEBufferSize(); // Configurable SSE buffer size

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          const chunk = decoder.decode(value, { stream: true });

          // Check buffer size limit to prevent memory leaks
          if (buffer.length + chunk.length > MAX_BUFFER_SIZE) {
            const bufferSizeMB = MAX_BUFFER_SIZE / (1024 * 1024);
            console.error(
              `SSE buffer size exceeded limit (${bufferSizeMB}MB), dropping connection`,
            );
            throw new Error(
              `SSE buffer size exceeded maximum limit (${bufferSizeMB}MB)`,
            );
          }

          buffer += chunk;

          // Process complete events
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // Keep incomplete lines

          let currentEvent: { type?: string; data?: string } = {};

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              currentEvent.type = line.substring(7);
            } else if (line.startsWith("data: ")) {
              currentEvent.data = line.substring(6);
            } else if (line === "" && currentEvent.type && currentEvent.data) {
              // Complete event, process it
              try {
                const eventData = JSON.parse(currentEvent.data);
                onEvent({
                  type: currentEvent.type as StreamEvent["type"],
                  data: eventData,
                });
              } catch (parseError) {
                console.warn("Failed to parse event data:", parseError);
              }
              currentEvent = {};
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        // Send complete event instead of error event when request is cancelled
        onEvent({
          type: "complete",
          data: {
            message: "Request cancelled by user",
            cancelled: true,
          },
        });
      } else {
        console.error("SSE stream error:", error);
        onEvent({
          type: "error",
          data: {
            error: error instanceof Error ? error.message : "Unknown error",
          },
        });
      }
    }
  }

  async *streamResponse(
    stream: ReadableStream<Uint8Array>,
  ): AsyncGenerator<string, void, unknown> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        yield chunk;
      }
    } finally {
      reader.releaseLock();
    }
  }

  async cancelCurrentRequest(claudeSessionId?: string | null): Promise<void> {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;

      // Also interrupt the backend query via API
      if (claudeSessionId) {
        try {
          await fetch(
            `/api/claude/query?clientSessionId=${encodeURIComponent(claudeSessionId)}`,
            {
              method: "DELETE",
            },
          );
        } catch (error) {
          console.warn(
            "[ClaudeCodeService] Failed to interrupt backend query:",
            error,
          );
        }
      }
    }
  }

  isAuthenticated(): boolean {
    return this.authenticated;
  }

  // getCurrentProject is no longer needed because projectPath is now passed directly in each request

  // In the new architecture, message history is managed by the frontend UI, not dependent on the backend
  async getMessageHistory(projectPath: string): Promise<Message[]> {
    console.log(
      "[ClaudeCodeService] Message history requested for:",
      projectPath,
    );
    console.log(
      "[ClaudeCodeService] In new architecture, message history is managed by UI state",
    );
    console.log(
      "[ClaudeCodeService] Claude Code SDK handles conversation context via resume mechanism",
    );
    return []; // Return empty array, let frontend UI manage message state
  }

  // Helper method: process file uploads
  async processFileAttachments(files: File[]): Promise<FileAttachment[]> {
    const attachments: FileAttachment[] = [];

    for (const file of files) {
      const attachment: FileAttachment = {
        id: uuidv4(),
        name: file.name,
        type: file.type,
        size: file.size,
      };

      // Read content if it's a text file
      if (
        file.type.startsWith("text/") ||
        file.name.endsWith(".md") ||
        file.name.endsWith(".txt") ||
        file.name.endsWith(".json")
      ) {
        try {
          const content = await file.text();
          attachment.content = content;
        } catch (error) {
          console.warn(`Failed to read file content: ${file.name}`, error);
        }
      }

      attachments.push(attachment);
    }

    return attachments;
  }

  // Create test message (used during development)
  createTestMessage(
    content: string,
    role: "user" | "assistant" = "assistant",
  ): Message {
    return {
      id: uuidv4(),
      role,
      content,
      timestamp: new Date(),
      status: "sent",
    };
  }
}

// Singleton pattern
export const claudeCodeService = new ClaudeCodeService();
export default claudeCodeService;
