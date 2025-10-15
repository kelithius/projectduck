import { NextResponse } from "next/server";
import { appConfig } from "@/lib/services/appConfigService";

/**
 * GET /api/config/status
 *
 * Returns current application configuration summary
 * Used for debugging and system status checks
 */
export async function GET() {
  try {
    const config = appConfig.getConfig();

    const statusResponse = {
      success: true,
      data: {
        config: {
          claude: {
            sseBufferSizeMB: config.claude.sseBufferSizeMB,
            maxResponseSizeMB: config.claude.maxResponseSizeMB,
            connectionTimeoutMs: config.claude.connectionTimeoutMs,
            retryAttempts: config.claude.retryAttempts,
          },
          files: {
            maxFileSizeMB: config.files.maxFileSizeMB,
            maxPreviewSizeMB: config.files.maxPreviewSizeMB,
            watchIntervalMs: config.files.watchIntervalMs,
          },
          security: {
            enablePathValidation: config.security.enablePathValidation,
            allowedExtensionsCount: config.security.allowedExtensions.length,
            blockedPathsCount: config.security.blockedPaths.length,
          },
          performance: {
            enableVirtualization: config.performance.enableVirtualization,
            virtualizationThreshold: config.performance.virtualizationThreshold,
            cacheMaxAge: config.performance.cacheMaxAge,
          },
        },
        computed: {
          sseBufferSizeBytes: appConfig.getSSEBufferSize(),
          maxFileSizeBytes: appConfig.getMaxFileSize(),
        },
        summary: appConfig.getConfigSummary(),
        environment: {
          nodeEnv: process.env.NODE_ENV,
          platform: process.platform,
          nodeVersion: process.version,
        },
        timestamp: new Date().toISOString(),
      },
    };

    return NextResponse.json(statusResponse, { status: 200 });
  } catch (error) {
    console.error("[Config Status API] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Configuration error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
