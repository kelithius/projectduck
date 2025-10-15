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

  // 惡意路徑模式檢測
  private static readonly MALICIOUS_PATTERNS = [
    /\.\./g, // 路徑遍歷
    /~+/g, // 家目錄符號
    /%2e%2e/gi, // URL編碼的 ..
    /%2f/gi, // URL編碼的 /
    /%5c/gi, // URL編碼的 \
    /\0/g, // 空字元
    /[<>"|*?:]/g, // 檔名非法字元
    /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i, // Windows 保留檔名
  ];

  // 允許的隱藏檔案白名單
  private static readonly ALLOWED_HIDDEN_FILES = [
    "gitignore",
    "env",
    "editorconfig",
    "prettierrc",
    "eslintrc",
    "nvmrc",
    "node-version",
  ];

  // 危險可執行檔案檢測 (分離出來避免阻擋必要檔案)
  private static readonly DANGEROUS_EXECUTABLES = [
    /\.(exe|bat|cmd|scr|pif|com|dll|vbs|jar)$/i, // Windows 可執行檔
    /\.(ps1|psm1|psd1)$/i, // PowerShell
    /\.(msi|msp)$/i, // Windows Installer
    /\.(app|dmg|pkg)$/i, // macOS 執行檔
  ];

  /**
   * 記錄安全事件
   */
  private static logSecurityEvent(log: Omit<SecurityLog, "timestamp">): void {
    const securityLog: SecurityLog = {
      ...log,
      timestamp: new Date(),
    };

    this.securityLogs.unshift(securityLog);

    // 限制記錄大小
    if (this.securityLogs.length > this.MAX_LOGS) {
      this.securityLogs = this.securityLogs.slice(0, this.MAX_LOGS);
    }

    // 記錄到 console (生產環境可以改為發送到監控系統)
    const logLevel =
      log.severity === "critical" || log.severity === "high" ? "error" : "warn";
    console[logLevel](`[SecurityService] ${log.type.toUpperCase()}:`, {
      path: log.requestPath,
      severity: log.severity,
      timestamp: securityLog.timestamp.toISOString(),
    });
  }

  /**
   * URL 解碼和正規化處理 (防止編碼繞過)
   */
  private static sanitizePath(requestPath: string): string {
    let sanitized = requestPath;

    // 多層 URL 解碼 (防止雙重編碼繞過)
    let previous = "";
    while (previous !== sanitized) {
      previous = sanitized;
      try {
        sanitized = decodeURIComponent(sanitized);
      } catch {
        // 如果解碼失敗，視為可疑請求
        this.logSecurityEvent({
          type: "malicious_pattern",
          requestPath: requestPath,
          clientInfo: this.getClientInfo(),
          severity: "high",
        });
        throw new Error("Invalid path format");
      }
    }

    // 正規化路徑
    sanitized = path.normalize(sanitized);

    return sanitized;
  }

  /**
   * 檢查隱藏檔案是否允許 (嚴格匹配)
   */
  private static isAllowedHiddenFile(filename: string): boolean {
    if (!filename.startsWith(".")) {
      return true; // 不是隱藏檔案
    }

    const nameWithoutDot = filename.substring(1);

    // 嚴格匹配：只允許確切的檔名或確切的副檔名模式
    return this.ALLOWED_HIDDEN_FILES.some((allowed) => {
      // 完全匹配 (.gitignore)
      if (nameWithoutDot === allowed) return true;

      // 只允許特定的副檔名模式 (.eslintrc.js, .prettierrc.json 等)
      if (allowed === "eslintrc" || allowed === "prettierrc") {
        return nameWithoutDot.match(
          new RegExp(`^${allowed}\\.(js|json|yml|yaml)$`),
        );
      }

      // .env 只允許特定模式 (.env.local, .env.development 等)
      if (allowed === "env") {
        return nameWithoutDot.match(
          /^env\.(local|development|staging|production)$/,
        );
      }

      return false;
    });
  }

  /**
   * 檢查惡意模式
   */
  private static checkMaliciousPatterns(requestPath: string): void {
    // 檢查基本惡意模式
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

    // 檢查隱藏檔案
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
   * 檢查危險可執行檔案
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
   * 檢查檔案擴展名白名單
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
   * 檢查路徑是否在封鎖列表中
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
   * 取得客戶端資訊 (用於安全記錄)
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

    // 在瀏覽器環境中收集基本資訊
    if (typeof window !== "undefined") {
      clientInfo.userAgent = navigator.userAgent;
      clientInfo.ip = "client-side"; // 客戶端無法取得真實 IP
    } else {
      // 伺服器端環境：嘗試從 process.env 或 request headers 獲取資訊
      // 這需要在 API route 中正確設置
      clientInfo.userAgent = process.env.HTTP_USER_AGENT || "server-side";
      clientInfo.ip =
        process.env.REMOTE_ADDR ||
        process.env.HTTP_X_FORWARDED_FOR ||
        "unknown";
    }

    return clientInfo;
  }
  /**
   * 強化的路徑驗證 (A 級安全性)
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

    // 1. URL 解碼和路徑正規化 (防止編碼繞過)
    const sanitized = this.sanitizePath(requestPath);

    // 2. 檢查惡意模式
    this.checkMaliciousPatterns(sanitized);

    // 3. 檢查封鎖路徑
    this.checkBlockedPaths(sanitized);

    // 4. 檢查危險可執行檔案
    this.checkDangerousExecutables(sanitized);

    // 5. 檢查檔案擴展名白名單 (如果有擴展名的話)
    if (path.extname(sanitized)) {
      this.validateFileExtension(sanitized);
    }

    // 6. 解析絕對路徑
    const resolvedPath = path.resolve(basePath, sanitized);
    const resolvedBasePath = path.resolve(basePath);

    // 7. 確保路徑在基礎目錄內 (嚴格的跨平台安全檢查)
    const normalizedResolved = path
      .normalize(resolvedPath)
      .replace(/[\/\\]/g, path.sep);
    const normalizedBase = path
      .normalize(resolvedBasePath)
      .replace(/[\/\\]/g, path.sep)
      .replace(/[\/\\]+$/, "");

    // 使用更嚴格的邊界檢查，避免 /app vs /application 的問題
    const relativePath = path.relative(normalizedBase, normalizedResolved);

    // 如果相對路徑為空或不包含 '..' 且不以 '/' 開頭，則安全
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

    // 8. 最終檢查：確保解析後的路徑沒有惡意模式
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
   * 取得安全事件記錄 (用於監控和分析)
   */
  static getSecurityLogs(limit?: number): SecurityLog[] {
    if (limit && limit > 0) {
      return this.securityLogs.slice(0, limit);
    }
    return [...this.securityLogs];
  }

  /**
   * 清除安全事件記錄
   */
  static clearSecurityLogs(): void {
    this.securityLogs = [];
    console.log("[SecurityService] Security logs cleared");
  }

  /**
   * 取得安全統計資訊
   */
  static getSecurityStats(): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    recentEvents: number; // 最近24小時
  } {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const eventsByType: Record<string, number> = {};
    const eventsBySeverity: Record<string, number> = {};
    let recentEvents = 0;

    this.securityLogs.forEach((log) => {
      // 統計類型
      eventsByType[log.type] = (eventsByType[log.type] || 0) + 1;

      // 統計嚴重程度
      eventsBySeverity[log.severity] =
        (eventsBySeverity[log.severity] || 0) + 1;

      // 統計最近24小時事件
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
