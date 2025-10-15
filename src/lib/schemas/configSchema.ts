import { z } from "zod";

/**
 * Zod schema for application configuration
 * Provides type-safe runtime validation of config values
 */
export const ConfigSchema = z.object({
  claude: z.object({
    enabled: z.boolean(),
    sseBufferSizeMB: z.number().min(1).max(50),
    maxResponseSizeMB: z.number().min(1).max(100),
    connectionTimeoutMs: z.number().min(1000).max(120000),
    retryAttempts: z.number().min(0).max(10),
  }),
  files: z.object({
    maxFileSizeMB: z.number().min(1).max(100),
    maxPreviewSizeMB: z.number().min(1).max(50),
    watchIntervalMs: z.number().min(100).max(10000),
  }),
  security: z.object({
    enablePathValidation: z.boolean(),
    allowedExtensions: z.array(z.string()),
    blockedPaths: z.array(z.string()),
  }),
  performance: z.object({
    enableVirtualization: z.boolean(),
    virtualizationThreshold: z.number().min(100).max(10000),
    cacheMaxAge: z.number().min(0).max(3600),
  }),
});

/**
 * TypeScript type inferred from the Zod schema
 * This ensures type safety at compile time and runtime
 */
export type AppConfig = z.infer<typeof ConfigSchema>;

/**
 * Validate configuration object against schema
 * @param config Configuration object to validate
 * @returns Validated configuration
 * @throws {z.ZodError} If validation fails
 */
export function validateConfig(config: unknown): AppConfig {
  return ConfigSchema.parse(config);
}

/**
 * Safely validate configuration with detailed error messages
 * @param config Configuration object to validate
 * @returns Result object with success status and data or error
 */
export function safeValidateConfig(
  config: unknown,
): { success: true; data: AppConfig } | { success: false; error: z.ZodError } {
  const result = ConfigSchema.safeParse(config);
  return result;
}
