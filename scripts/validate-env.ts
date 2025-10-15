#!/usr/bin/env tsx
/**
 * Build-time environment variable validation script
 * Validates environment variables before the build process starts
 * Fails fast if required variables are missing or invalid
 */

import { z } from "zod";
import * as dotenv from "dotenv";

// Load environment variables from .env files
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

/**
 * Environment variable schema
 * Defines validation rules for all environment variables
 */
const envSchema = z.object({
  // Base path is required
  BASE_PATH: z.string().min(1, "BASE_PATH must not be empty"),

  // Claude Code configuration (optional)
  ENABLE_CLAUDE_CODE: z
    .string()
    .regex(/^(true|false)$/, 'ENABLE_CLAUDE_CODE must be "true" or "false"')
    .optional()
    .default("false"),

  CLAUDE_SSE_BUFFER_SIZE_MB: z
    .string()
    .regex(/^\d+$/, "Must be a number")
    .transform(Number)
    .refine((n) => n >= 1 && n <= 50, "Must be between 1-50 MB")
    .optional(),

  CLAUDE_MAX_RESPONSE_SIZE_MB: z
    .string()
    .regex(/^\d+$/, "Must be a number")
    .transform(Number)
    .refine((n) => n >= 1 && n <= 100, "Must be between 1-100 MB")
    .optional(),

  CLAUDE_CONNECTION_TIMEOUT_MS: z
    .string()
    .regex(/^\d+$/, "Must be a number")
    .transform(Number)
    .refine((n) => n >= 1000 && n <= 120000, "Must be between 1000-120000 ms")
    .optional(),

  CLAUDE_RETRY_ATTEMPTS: z
    .string()
    .regex(/^\d+$/, "Must be a number")
    .transform(Number)
    .refine((n) => n >= 0 && n <= 10, "Must be between 0-10")
    .optional(),

  // File processing configuration (optional)
  MAX_FILE_SIZE_MB: z
    .string()
    .regex(/^\d+$/, "Must be a number")
    .transform(Number)
    .refine((n) => n >= 1 && n <= 100, "Must be between 1-100 MB")
    .optional(),

  MAX_PREVIEW_SIZE_MB: z
    .string()
    .regex(/^\d+$/, "Must be a number")
    .transform(Number)
    .refine((n) => n >= 1 && n <= 50, "Must be between 1-50 MB")
    .optional(),

  FILE_WATCH_INTERVAL_MS: z
    .string()
    .regex(/^\d+$/, "Must be a number")
    .transform(Number)
    .refine((n) => n >= 100 && n <= 10000, "Must be between 100-10000 ms")
    .optional(),

  // Force polling mode (optional)
  FORCE_POLLING: z
    .string()
    .regex(/^(true|false)$/, 'FORCE_POLLING must be "true" or "false"')
    .optional(),

  // Security configuration (optional)
  ENABLE_PATH_VALIDATION: z
    .string()
    .regex(/^(true|false)$/, 'ENABLE_PATH_VALIDATION must be "true" or "false"')
    .optional(),

  // Performance configuration (optional)
  ENABLE_VIRTUALIZATION: z
    .string()
    .regex(/^(true|false)$/, 'ENABLE_VIRTUALIZATION must be "true" or "false"')
    .optional(),

  VIRTUALIZATION_THRESHOLD: z
    .string()
    .regex(/^\d+$/, "Must be a number")
    .transform(Number)
    .refine((n) => n >= 100 && n <= 10000, "Must be between 100-10000")
    .optional(),

  CACHE_MAX_AGE: z
    .string()
    .regex(/^\d+$/, "Must be a number")
    .transform(Number)
    .refine((n) => n >= 0 && n <= 3600, "Must be between 0-3600 seconds")
    .optional(),
});

// Perform validation
console.log("🔍 Validating environment variables...\n");

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error("❌ Environment variable validation failed:\n");

  // Group errors by field
  const errorsByField = new Map<string, string[]>();
  result.error.issues.forEach((issue) => {
    const field = issue.path.join(".");
    const errors = errorsByField.get(field) || [];
    errors.push(issue.message);
    errorsByField.set(field, errors);
  });

  // Print errors in a readable format
  errorsByField.forEach((errors, field) => {
    console.error(`  ${field}:`);
    errors.forEach((error) => {
      console.error(`    - ${error}`);
    });
  });

  console.error("\n💡 Tip: Check your .env.local or .env file");
  console.error("💡 See .env.example for valid configuration examples\n");

  process.exit(1);
}

// Success
console.log("✅ Environment variables validated successfully");
console.log("\nValidated variables:");
Object.entries(result.data).forEach(([key, value]) => {
  // Don't print sensitive values
  const displayValue =
    typeof value === "string" && value.length > 50
      ? `${value.substring(0, 47)}...`
      : value;
  console.log(`  ${key}: ${displayValue}`);
});
console.log("");

process.exit(0);
