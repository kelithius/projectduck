import path from "path";
import { appConfig } from "./appConfigService";

interface SecurityLog {
  timestamp: Date;
  type:
    | "path_traversal"
    | "forbidden_extension"
    | "file_too_large"
    | "malicious_pattern";
  requestPath: string;
  clientInfo: {
    userAgent?: string;
    ip?: string;
  };
  severity: "low" | "medium" | "high" | "critical";
}

export class SecurityService {
  private static securityLogs: SecurityLog[] = [];
  private static readonly MAX_LOGS = 1000;

  // Malicious path pattern detection
  private static readonly MALICIOUS_PATTERNS = [
    /\.\./g, // Path traversal
    /~+/g, // Home directory symbol
    /%2e%2e/gi, // URL-encoded ..
    /%2f/gi, // URL-encoded /
    /%5c/gi, // URL-encoded \
    /\0/g, // Null character
    /[<>"|*?:]/g, // Invalid filename characters
    /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i, // Windows reserved filenames
  ];

  // Allowed hidden files whitelist
  private static readonly ALLOWED_HIDDEN_FILES = [
    "gitignore",
    "env",
    "editorconfig",
    "prettierrc",
    "eslintrc",
    "nvmrc",
    "node-version",
  ];

  // Dangerous executable file detection (separated to avoid blocking necessary files)
  private static readonly DANGEROUS_EXECUTABLES = [
    /\.(exe|bat|cmd|scr|pif|com|dll|vbs|jar)$/i, // Windows executables
    /\.(ps1|psm1|psd1)$/i, // PowerShell
    /\.(msi|msp)$/i, // Windows Installer
    /\.(app|dmg|pkg)$/i, // macOS executables
  ];

  /**
   * Log security events
   */
  private static logSecurityEvent(log: Omit<SecurityLog, "timestamp">): void {
    const securityLog: SecurityLog = {
      ...log,
      timestamp: new Date(),
    };

    this.securityLogs.unshift(securityLog);

    // Limit log size
    if (this.securityLogs.length > this.MAX_LOGS) {
      this.securityLogs = this.securityLogs.slice(0, this.MAX_LOGS);
    }

    // Log to console (can be changed to send to monitoring system in production)
    const logLevel =
      log.severity === "critical" || log.severity === "high" ? "error" : "warn";
    console[logLevel](`[SecurityService] ${log.type.toUpperCase()}:`, {
      path: log.requestPath,
      severity: log.severity,
      timestamp: securityLog.timestamp.toISOString(),
    });
  }

  /**
   * URL decoding and normalization (prevents encoding bypass)
   */
  private static sanitizePath(requestPath: string): string {
    let sanitized = requestPath;

    // Multi-layer URL decoding (prevents double encoding bypass)
    let previous = "";
    while (previous !== sanitized) {
      previous = sanitized;
      try {
        sanitized = decodeURIComponent(sanitized);
      } catch {
        // If decoding fails, treat as suspicious request
        this.logSecurityEvent({
          type: "malicious_pattern",
          requestPath: requestPath,
          clientInfo: this.getClientInfo(),
          severity: "high",
        });
        throw new Error("Invalid path format");
      }
    }

    // Normalize path
    sanitized = path.normalize(sanitized);

    return sanitized;
  }

  /**
   * Check if hidden file is allowed (strict matching)
   */
  private static isAllowedHiddenFile(filename: string): boolean {
    if (!filename.startsWith(".")) {
      return true; // Not a hidden file
    }

    const nameWithoutDot = filename.substring(1);

    // Strict matching: only allow exact filenames or exact extension patterns
    return this.ALLOWED_HIDDEN_FILES.some((allowed) => {
      // Exact match (.gitignore)
      if (nameWithoutDot === allowed) return true;

      // Only allow specific extension patterns (.eslintrc.js, .prettierrc.json, etc.)
      if (allowed === "eslintrc" || allowed === "prettierrc") {
        return nameWithoutDot.match(
          new RegExp(`^${allowed}\\.(js|json|yml|yaml)$`),
        );
      }

      // .env only allows specific patterns (.env.local, .env.development, etc.)
      if (allowed === "env") {
        return nameWithoutDot.match(
          /^env\.(local|development|staging|production)$/,
        );
      }

      return false;
    });
  }

  /**
   * Check for malicious patterns
   */
  private static checkMaliciousPatterns(requestPath: string): void {
    // Check basic malicious patterns
    for (const pattern of this.MALICIOUS_PATTERNS) {
      if (pattern.test(requestPath)) {
        this.logSecurityEvent({
          type: "malicious_pattern",
          requestPath,
          clientInfo: this.getClientInfo(),
          severity: "critical",
        });
        throw new Error("Invalid path format");
      }
    }

    // Check hidden files
    const pathSegments = requestPath.split(path.sep);
    for (const segment of pathSegments) {
      if (segment.startsWith(".") && !this.isAllowedHiddenFile(segment)) {
        this.logSecurityEvent({
          type: "malicious_pattern",
          requestPath,
          clientInfo: this.getClientInfo(),
          severity: "high",
        });
        throw new Error("Access denied");
      }
    }
  }

  /**
   * Check for dangerous executable files
   */
  private static checkDangerousExecutables(filePath: string): void {
    for (const pattern of this.DANGEROUS_EXECUTABLES) {
      if (pattern.test(filePath)) {
        this.logSecurityEvent({
          type: "forbidden_extension",
          requestPath: filePath,
          clientInfo: this.getClientInfo(),
          severity: "high",
        });
        throw new Error("File type not permitted");
      }
    }
  }

  /**
   * Validate file extension against whitelist
   */
  private static validateFileExtension(filePath: string): void {
    const ext = path.extname(filePath).toLowerCase();
    const allowedExtensions = appConfig.getSecurityConfig().allowedExtensions;

    if (ext && !allowedExtensions.includes(ext)) {
      this.logSecurityEvent({
        type: "forbidden_extension",
        requestPath: filePath,
        clientInfo: this.getClientInfo(),
        severity: "medium",
      });
      throw new Error("File type not permitted");
    }
  }

  /**
   * Check if path is in blocked list
   */
  private static checkBlockedPaths(requestPath: string): void {
    const blockedPaths = appConfig.getSecurityConfig().blockedPaths;
    const pathParts = requestPath.split(path.sep);

    for (const blockedPattern of blockedPaths) {
      if (pathParts.some((part) => part.includes(blockedPattern))) {
        this.logSecurityEvent({
          type: "path_traversal",
          requestPath,
          clientInfo: this.getClientInfo(),
          severity: "high",
        });
        throw new Error("Access denied");
      }
    }
  }

  /**
   * Get client information (for security logging)
   */
  private static getClientInfo(): {
    userAgent?: string;
    ip?: string;
    timestamp?: string;
  } {
    const clientInfo: { userAgent?: string; ip?: string; timestamp?: string } =
      {
        timestamp: new Date().toISOString(),
      };

    // Collect basic information in browser environment
    if (typeof window !== "undefined") {
      clientInfo.userAgent = navigator.userAgent;
      clientInfo.ip = "client-side"; // Client-side cannot get real IP
    } else {
      // Server-side environment: attempt to get information from process.env or request headers
      // This needs to be properly set in API route
      clientInfo.userAgent = process.env.HTTP_USER_AGENT || "server-side";
      clientInfo.ip =
        process.env.REMOTE_ADDR ||
        process.env.HTTP_X_FORWARDED_FOR ||
        "unknown";
    }

    return clientInfo;
  }
  /**
   * Enhanced path validation (A-level security)
   */
  static validatePath(requestPath: string = "", basePath: string): string {
    if (!requestPath || !basePath) {
      this.logSecurityEvent({
        type: "malicious_pattern",
        requestPath: requestPath || "",
        clientInfo: this.getClientInfo(),
        severity: "medium",
      });
      throw new Error("Invalid request");
    }

    // 1. URL decoding and path normalization (prevents encoding bypass)
    const sanitized = this.sanitizePath(requestPath);

    // 2. Check for malicious patterns
    this.checkMaliciousPatterns(sanitized);

    // 3. Check blocked paths
    this.checkBlockedPaths(sanitized);

    // 4. Check dangerous executables
    this.checkDangerousExecutables(sanitized);

    // 5. Validate file extension whitelist (if extension exists)
    if (path.extname(sanitized)) {
      this.validateFileExtension(sanitized);
    }

    // 6. Resolve absolute path
    const resolvedPath = path.resolve(basePath, sanitized);
    const resolvedBasePath = path.resolve(basePath);

    // 7. Ensure path is within base directory (strict cross-platform security check)
    const normalizedResolved = path
      .normalize(resolvedPath)
      .replace(/[\/\\]/g, path.sep);
    const normalizedBase = path
      .normalize(resolvedBasePath)
      .replace(/[\/\\]/g, path.sep)
      .replace(/[\/\\]+$/, "");

    // Use stricter boundary check to avoid /app vs /application issues
    const relativePath = path.relative(normalizedBase, normalizedResolved);

    // Safe if relative path is empty or doesn't contain '..' and doesn't start with '/'
    if (
      relativePath &&
      (relativePath.startsWith("..") || path.isAbsolute(relativePath))
    ) {
      this.logSecurityEvent({
        type: "path_traversal",
        requestPath,
        clientInfo: this.getClientInfo(),
        severity: "critical",
      });
      throw new Error("Access denied");
    }

    // 8. Final check: ensure resolved path has no malicious patterns
    this.checkMaliciousPatterns(resolvedPath);

    return resolvedPath;
  }

  static isPathSafe(requestPath: string, basePath: string): boolean {
    try {
      this.validatePath(requestPath, basePath);
      return true;
    } catch {
      return false;
    }
  }

  static getRelativePath(absolutePath: string, basePath: string): string {
    const resolvedBasePath = path.resolve(basePath);
    return path.relative(resolvedBasePath, absolutePath);
  }

  /**
   * Get security event logs (for monitoring and analysis)
   */
  static getSecurityLogs(limit?: number): SecurityLog[] {
    if (limit && limit > 0) {
      return this.securityLogs.slice(0, limit);
    }
    return [...this.securityLogs];
  }

  /**
   * Clear security event logs
   */
  static clearSecurityLogs(): void {
    this.securityLogs = [];
    console.log("[SecurityService] Security logs cleared");
  }

  /**
   * Get security statistics
   */
  static getSecurityStats(): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    recentEvents: number; // Last 24 hours
  } {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const eventsByType: Record<string, number> = {};
    const eventsBySeverity: Record<string, number> = {};
    let recentEvents = 0;

    this.securityLogs.forEach((log) => {
      // Count by type
      eventsByType[log.type] = (eventsByType[log.type] || 0) + 1;

      // Count by severity
      eventsBySeverity[log.severity] =
        (eventsBySeverity[log.severity] || 0) + 1;

      // Count events in last 24 hours
      if (log.timestamp >= last24Hours) {
        recentEvents++;
      }
    });

    return {
      totalEvents: this.securityLogs.length,
      eventsByType,
      eventsBySeverity,
      recentEvents,
    };
  }

  /**
   * Categorize error into user-friendly message
   * Provides helpful messages without exposing sensitive information
   * @param error Error object from file system operations
   * @returns User-friendly error message
   */
  static categorizeError(error: unknown): string {
    if (error instanceof Error) {
      const nodeError = error as NodeJS.ErrnoException;

      switch (nodeError.code) {
        case "EACCES":
        case "EPERM":
          return "Permission denied accessing directory";

        case "ENOENT":
          return "Directory not found";

        case "ENOSPC":
          return "No space left on device";

        case "ENOTDIR":
          return "Path is not a directory";

        case "EISDIR":
          return "Path is a directory (expected file)";

        case "EMFILE":
        case "ENFILE":
          return "Too many open files";

        case "EBUSY":
          return "Resource is busy or locked";

        case "EEXIST":
          return "File or directory already exists";

        case "EINVAL":
          return "Invalid operation or parameters";

        case "EIO":
          return "I/O error occurred";

        case "EROFS":
          return "Read-only file system";

        case "ETIMEDOUT":
          return "Operation timed out";

        default:
          // Log unexpected errors for debugging without exposing to user
          console.error("[SecurityService] Unexpected error:", {
            code: nodeError.code,
            message: nodeError.message,
          });
          return "Cannot access directory";
      }
    }

    return "An unexpected error occurred";
  }
}
