/**
 * AppConfigService - Application Configuration Management Service
 *
 * Features:
 * - Manage application-level configuration
 * - Provide defaults and environment variable overrides
 * - Runtime configuration validation with Zod
 */

import { validateConfig, type AppConfig } from "@/lib/schemas/configSchema";

// Re-export AppConfig type for backwards compatibility
export type { AppConfig };

interface LegacyAppConfig {
  // Claude Code related configuration
  claude: {
    enabled: boolean; // Enable Claude Code integration
    sseBufferSizeMB: number; // SSE buffer size (MB)
    maxResponseSizeMB: number; // Maximum response size (MB)
    connectionTimeoutMs: number; // Connection timeout (milliseconds)
    retryAttempts: number; // Retry attempts
  };

  // File processing configuration
  files: {
    maxFileSizeMB: number; // Maximum file size (MB)
    maxPreviewSizeMB: number; // Preview size limit (MB)
    watchIntervalMs: number; // File watch interval (milliseconds)
  };

  // Security configuration
  security: {
    enablePathValidation: boolean; // Enable path validation
    allowedExtensions: string[]; // Allowed file extensions
    blockedPaths: string[]; // Blocked path patterns
  };

  // Performance configuration
  performance: {
    enableVirtualization: boolean; // Enable virtualization
    virtualizationThreshold: number; // Virtualization threshold
    cacheMaxAge: number; // Cache max age (seconds)
  };
}

class AppConfigService {
  private static instance: AppConfigService;
  private config: AppConfig;

  private constructor() {
    const rawConfig = this.loadConfig();

    // Runtime validation with Zod
    try {
      this.config = validateConfig(rawConfig);
      console.log("✅ Runtime configuration validated successfully");
    } catch (error) {
      console.error("❌ Runtime configuration validation failed:");
      if (error instanceof Error) {
        console.error(error.message);
      }
      throw new Error(
        "Invalid application configuration. Please check your environment variables.",
      );
    }
  }

  public static getInstance(): AppConfigService {
    if (!AppConfigService.instance) {
      AppConfigService.instance = new AppConfigService();
    }
    return AppConfigService.instance;
  }

  /**
   * Load configuration, priority: environment variables > defaults
   */
  private loadConfig(): AppConfig {
    const defaultConfig: AppConfig = {
      claude: {
        enabled: process.env.ENABLE_CLAUDE_CODE === "true", // Default disabled, must explicitly set to 'true' to enable
        sseBufferSizeMB: Number(process.env.CLAUDE_SSE_BUFFER_SIZE_MB) || 5,
        maxResponseSizeMB:
          Number(process.env.CLAUDE_MAX_RESPONSE_SIZE_MB) || 10,
        connectionTimeoutMs:
          Number(process.env.CLAUDE_CONNECTION_TIMEOUT_MS) || 30000,
        retryAttempts: Number(process.env.CLAUDE_RETRY_ATTEMPTS) || 3,
      },
      files: {
        maxFileSizeMB: Number(process.env.MAX_FILE_SIZE_MB) || 10,
        maxPreviewSizeMB: Number(process.env.MAX_PREVIEW_SIZE_MB) || 5,
        watchIntervalMs: Number(process.env.FILE_WATCH_INTERVAL_MS) || 1000,
      },
      security: {
        enablePathValidation: process.env.ENABLE_PATH_VALIDATION !== "false",
        allowedExtensions: process.env.ALLOWED_EXTENSIONS?.split(",") || [
          ".md",
          ".txt",
          ".json",
          ".js",
          ".ts",
          ".tsx",
          ".jsx",
          ".py",
          ".css",
          ".html",
          ".xml",
          ".yml",
          ".yaml",
        ],
        blockedPaths: process.env.BLOCKED_PATHS?.split(",") || [
          "node_modules",
          ".git",
          ".env",
          "dist",
          "build",
        ],
      },
      performance: {
        enableVirtualization: process.env.ENABLE_VIRTUALIZATION === "true",
        virtualizationThreshold:
          Number(process.env.VIRTUALIZATION_THRESHOLD) || 1000,
        cacheMaxAge: Number(process.env.CACHE_MAX_AGE) || 300,
      },
    };

    return defaultConfig;
  }

  // Validation is now handled by Zod schema in constructor

  /**
   * Get complete configuration
   */
  public getConfig(): AppConfig {
    return { ...this.config };
  }

  /**
   * Get Claude configuration
   */
  public getClaudeConfig() {
    return { ...this.config.claude };
  }

  /**
   * Get file configuration
   */
  public getFilesConfig() {
    return { ...this.config.files };
  }

  /**
   * Get security configuration
   */
  public getSecurityConfig() {
    return { ...this.config.security };
  }

  /**
   * Get performance configuration
   */
  public getPerformanceConfig() {
    return { ...this.config.performance };
  }

  /**
   * Get SSE buffer size in bytes
   */
  public getSSEBufferSize(): number {
    return this.config.claude.sseBufferSizeMB * 1024 * 1024;
  }

  /**
   * Get file size limit in bytes
   */
  public getMaxFileSize(): number {
    return this.config.files.maxFileSizeMB * 1024 * 1024;
  }

  /**
   * Runtime configuration update (for testing or dynamic adjustment)
   */
  public updateConfig(updates: Partial<AppConfig>): void {
    const newConfig = {
      ...this.config,
      ...updates,
      claude: { ...this.config.claude, ...updates.claude },
      files: { ...this.config.files, ...updates.files },
      security: { ...this.config.security, ...updates.security },
      performance: { ...this.config.performance, ...updates.performance },
    };

    // Validate updated config with Zod
    try {
      this.config = validateConfig(newConfig);
    } catch (error) {
      console.error("❌ Configuration update validation failed:", error);
      throw new Error("Invalid configuration update");
    }
  }

  /**
   * Check if Claude Code feature is enabled
   */
  public isClaudeCodeEnabled(): boolean {
    return this.config.claude.enabled;
  }

  /**
   * Get configuration summary (for debugging)
   */
  public getConfigSummary(): string {
    return JSON.stringify(
      {
        "Claude Code": this.config.claude.enabled ? "Enabled" : "Disabled",
        "SSE Buffer Size": `${this.config.claude.sseBufferSizeMB}MB`,
        "Max File Size": `${this.config.files.maxFileSizeMB}MB`,
        "Connection Timeout": `${this.config.claude.connectionTimeoutMs}ms`,
        "Path Validation": this.config.security.enablePathValidation
          ? "Enabled"
          : "Disabled",
        Virtualization: this.config.performance.enableVirtualization
          ? "Enabled"
          : "Disabled",
      },
      null,
      2,
    );
  }
}

// Export singleton instance
export const appConfig = AppConfigService.getInstance();
