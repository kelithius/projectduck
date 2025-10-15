import {
  query,
  type Query,
  type SDKMessage,
  type Options,
  type PermissionMode,
} from "@anthropic-ai/claude-code";
import { execSync } from "child_process";
import type { FileAttachment } from "@/lib/types/chat";

export interface SimplifiedQueryOptions {
  prompt: string;
  projectPath: string;
  clientSessionId?: string; // Session ID for resume functionality
  attachments?: File[];
  permissionMode?: PermissionMode;
  allowedTools?: string[];
  maxTurns?: number;
}

export interface QueryResult {
  success: boolean;
  queryGenerator?: Query;
  error?: string;
}

/**
 * Simplified Claude Code SDK Service
 *
 * Design Philosophy:
 * 1. Does not maintain its own session state
 * 2. Completely relies on Claude Code SDK's resume mechanism
 * 3. Each tab/refresh is a new beginning
 * 4. Stateless design, server does not persist any conversation history
 */
export class SimplifiedClaudeService {
  private static instance: SimplifiedClaudeService;
  private runningQueries: Map<
    string,
    { query: Query; abortController: AbortController }
  > = new Map();

  public static getInstance(): SimplifiedClaudeService {
    if (!SimplifiedClaudeService.instance) {
      SimplifiedClaudeService.instance = new SimplifiedClaudeService();
    }
    return SimplifiedClaudeService.instance;
  }

  private constructor() {}

  /**
   * Start query - simplified version
   */
  public async startQuery(
    options: SimplifiedQueryOptions,
  ): Promise<QueryResult> {
    const {
      prompt,
      projectPath,
      clientSessionId,
      attachments,
      permissionMode = "default",
      allowedTools = ["Read", "Write", "Edit", "Bash"],
      maxTurns = 50,
    } = options;

    try {
      console.log("[SimplifiedClaude] Starting query:", {
        clientSessionId: clientSessionId || "new-session",
        projectPath,
        hasAttachments: !!attachments?.length,
        resumeMode: !!clientSessionId,
      });

      // Construct SDK options
      const sdkOptions: Options = {
        cwd: projectPath,
        permissionMode,
        allowedTools,
        maxTurns,
        // If clientSessionId exists, use resume mechanism
        ...(clientSessionId ? { resumeSessionId: clientSessionId } : {}),
        abortController: new AbortController(),
        // Dynamically set Claude executable path
        ...this.getClaudeExecutablePath(),
      };

      // Process attachments and construct prompt
      const enhancedPrompt = await this.buildPromptWithAttachments(
        prompt,
        attachments || [],
      );

      // Create query
      const queryGenerator = query({
        prompt: enhancedPrompt,
        options: sdkOptions,
      });

      // Track running queries (for interruption)
      if (clientSessionId) {
        this.runningQueries.set(clientSessionId, {
          query: queryGenerator,
          abortController: sdkOptions.abortController!,
        });
      }

      return {
        success: true,
        queryGenerator,
      };
    } catch (error) {
      console.error("[SimplifiedClaude] Failed to start query:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Interrupt specified query
   */
  public async interruptQuery(clientSessionId: string): Promise<boolean> {
    const runningQuery = this.runningQueries.get(clientSessionId);
    if (runningQuery) {
      try {
        runningQuery.abortController.abort();
        this.runningQueries.delete(clientSessionId);
        console.log("[SimplifiedClaude] Query interrupted:", clientSessionId);
        return true;
      } catch (error) {
        console.error("[SimplifiedClaude] Failed to interrupt query:", error);
        return false;
      }
    }
    return false;
  }

  /**
   * Process query result stream
   */
  public async *processQuery(
    queryGenerator: Query,
    clientSessionId?: string,
  ): AsyncGenerator<SDKMessage, void, unknown> {
    try {
      for await (const message of queryGenerator) {
        console.log("[SimplifiedClaude] SDK Message type:", message.type);
        yield message;
      }
    } catch (error) {
      console.error("[SimplifiedClaude] Error in query processing:", error);
      throw error;
    } finally {
      // Clean up running query tracking
      if (clientSessionId) {
        this.runningQueries.delete(clientSessionId);
      }
    }
  }

  /**
   * Build prompt with attachments
   */
  private async buildPromptWithAttachments(
    prompt: string,
    attachments: File[],
  ): Promise<string> {
    if (attachments.length === 0) {
      return prompt;
    }

    let enhancedPrompt = prompt;

    // Process attachments
    const attachmentInfos: string[] = [];
    for (const file of attachments) {
      let info = `File: ${file.name} (${file.type}, ${this.formatFileSize(file.size)})`;

      // If it's a text file, read content
      if (this.isTextFile(file)) {
        try {
          const content = await file.text();
          info += `\nContent:\n${content}`;
        } catch (error) {
          console.warn(
            `[SimplifiedClaude] Failed to read file content: ${file.name}`,
            error,
          );
        }
      }

      attachmentInfos.push(info);
    }

    enhancedPrompt +=
      "\n\n--- Attached Files ---\n" + attachmentInfos.join("\n\n");
    return enhancedPrompt;
  }

  /**
   * Check if file is a text file
   */
  private isTextFile(file: File): boolean {
    return (
      file.type.startsWith("text/") ||
      file.name.endsWith(".md") ||
      file.name.endsWith(".txt") ||
      file.name.endsWith(".json") ||
      file.name.endsWith(".js") ||
      file.name.endsWith(".ts") ||
      file.name.endsWith(".py") ||
      file.name.endsWith(".css") ||
      file.name.endsWith(".html")
    );
  }

  /**
   * Format file size
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B";

    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }

  /**
   * Get Claude executable path
   */
  private getClaudeExecutablePath(): Partial<Options> {
    try {
      const claudePath = execSync("which claude", { encoding: "utf8" }).trim();
      console.log("[SimplifiedClaude] Claude executable found at:", claudePath);
      return { pathToClaudeCodeExecutable: claudePath };
    } catch {
      console.log(
        '[SimplifiedClaude] Could not find claude executable with "which" command',
      );
      if (process.env.CLAUDE_CODE_EXECUTABLE_PATH) {
        console.log(
          "[SimplifiedClaude] Using custom executable path:",
          process.env.CLAUDE_CODE_EXECUTABLE_PATH,
        );
        return {
          pathToClaudeCodeExecutable: process.env.CLAUDE_CODE_EXECUTABLE_PATH,
        };
      }
      return {};
    }
  }

  /**
   * Check if Claude CLI is available
   */
  public async checkClaudeAvailability(): Promise<{
    available: boolean;
    error?: string;
  }> {
    const isVertexMode = process.env.CLAUDE_CODE_USE_VERTEX === "1";
    const vertexProjectId = process.env.ANTHROPIC_VERTEX_PROJECT_ID;
    const hasGoogleCreds = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;

    console.log("[SimplifiedClaude] Authentication mode check:");
    console.log(
      `[SimplifiedClaude]   - Vertex AI mode: ${isVertexMode ? "ENABLED" : "DISABLED"}`,
    );
    if (isVertexMode) {
      console.log(
        `[SimplifiedClaude]   - Project ID: ${vertexProjectId || "NOT SET"}`,
      );
      console.log(
        `[SimplifiedClaude]   - Google credentials: ${hasGoogleCreds ? "SET" : "NOT SET"}`,
      );
    }

    try {
      // Create test query
      const testOptions: Options = {
        cwd: process.cwd(),
        maxTurns: 1,
        abortController: new AbortController(),
        ...this.getClaudeExecutablePath(),
      };

      // Try to create query to test SDK availability
      query({
        prompt: "Hello",
        options: testOptions,
      });

      // Abort immediately to avoid actual execution
      testOptions.abortController?.abort();

      console.log(
        `[SimplifiedClaude] ✅ Authentication successful - ${isVertexMode ? "Vertex AI" : "Standard"} mode`,
      );
      return { available: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      if (
        errorMessage.includes("authenticate") ||
        errorMessage.includes("login") ||
        errorMessage.includes("auth")
      ) {
        if (isVertexMode) {
          console.log("[SimplifiedClaude] ❌ Vertex AI authentication failed");
          return {
            available: false,
            error:
              "Vertex AI authentication required. Please ensure GOOGLE_APPLICATION_CREDENTIALS and ANTHROPIC_VERTEX_PROJECT_ID are set correctly.",
          };
        } else {
          console.log("[SimplifiedClaude] ❌ Standard authentication failed");
          return {
            available: false,
            error: "Authentication required. Please run: claude login",
          };
        }
      }

      console.log(
        "[SimplifiedClaude] ⚠️ Authentication check failed:",
        errorMessage,
      );
      return {
        available: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get statistics
   */
  public getStats() {
    return {
      runningQueries: this.runningQueries.size,
      queryIds: Array.from(this.runningQueries.keys()),
    };
  }
}

// Export singleton instance
export const simplifiedClaudeService = SimplifiedClaudeService.getInstance();
