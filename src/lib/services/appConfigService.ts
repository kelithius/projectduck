/**
 * AppConfigService - 應用程式配置管理服務
 * 
 * 功能：
 * - 管理應用程式級別的配置
 * - 提供預設值和環境變數覆蓋
 * - 運行時配置驗證
 */

export interface AppConfig {
  // Claude Code 相關配置
  claude: {
    sseBufferSizeMB: number;        // SSE buffer 大小 (MB)
    maxResponseSizeMB: number;      // 最大回應大小 (MB) 
    connectionTimeoutMs: number;    // 連線超時時間 (毫秒)
    retryAttempts: number;         // 重試次數
  };
  
  // 檔案處理配置
  files: {
    maxFileSizeMB: number;         // 最大檔案大小 (MB)
    maxPreviewSizeMB: number;      // 預覽大小限制 (MB)
    watchIntervalMs: number;       // 檔案監控間隔 (毫秒)
  };

  // 安全性配置
  security: {
    enablePathValidation: boolean;  // 啟用路徑驗證
    allowedExtensions: string[];   // 允許的檔案擴展名
    blockedPaths: string[];        // 封鎖的路徑模式
  };

  // 效能配置
  performance: {
    enableVirtualization: boolean; // 啟用虛擬化
    virtualizationThreshold: number; // 虛擬化門檻
    cacheMaxAge: number;          // 快取最大年齡 (秒)
  };
}

class AppConfigService {
  private static instance: AppConfigService;
  private config: AppConfig;

  private constructor() {
    this.config = this.loadConfig();
    this.validateConfig();
  }

  public static getInstance(): AppConfigService {
    if (!AppConfigService.instance) {
      AppConfigService.instance = new AppConfigService();
    }
    return AppConfigService.instance;
  }

  /**
   * 載入配置，優先序：環境變數 > 預設值
   */
  private loadConfig(): AppConfig {
    const defaultConfig: AppConfig = {
      claude: {
        sseBufferSizeMB: Number(process.env.CLAUDE_SSE_BUFFER_SIZE_MB) || 5,
        maxResponseSizeMB: Number(process.env.CLAUDE_MAX_RESPONSE_SIZE_MB) || 10,
        connectionTimeoutMs: Number(process.env.CLAUDE_CONNECTION_TIMEOUT_MS) || 30000,
        retryAttempts: Number(process.env.CLAUDE_RETRY_ATTEMPTS) || 3,
      },
      files: {
        maxFileSizeMB: Number(process.env.MAX_FILE_SIZE_MB) || 10,
        maxPreviewSizeMB: Number(process.env.MAX_PREVIEW_SIZE_MB) || 5,
        watchIntervalMs: Number(process.env.FILE_WATCH_INTERVAL_MS) || 1000,
      },
      security: {
        enablePathValidation: process.env.ENABLE_PATH_VALIDATION !== 'false',
        allowedExtensions: process.env.ALLOWED_EXTENSIONS?.split(',') || [
          '.md', '.txt', '.json', '.js', '.ts', '.tsx', '.jsx', 
          '.py', '.css', '.html', '.xml', '.yml', '.yaml'
        ],
        blockedPaths: process.env.BLOCKED_PATHS?.split(',') || [
          'node_modules', '.git', '.env', 'dist', 'build'
        ],
      },
      performance: {
        enableVirtualization: process.env.ENABLE_VIRTUALIZATION === 'true',
        virtualizationThreshold: Number(process.env.VIRTUALIZATION_THRESHOLD) || 1000,
        cacheMaxAge: Number(process.env.CACHE_MAX_AGE) || 300,
      }
    };

    return defaultConfig;
  }

  /**
   * 驗證配置值的合理性
   */
  private validateConfig(): void {
    const { claude, files, performance } = this.config;

    // 驗證 Claude 配置
    if (claude.sseBufferSizeMB < 1 || claude.sseBufferSizeMB > 50) {
      throw new Error('Claude SSE buffer size must be between 1-50MB');
    }

    if (claude.maxResponseSizeMB < claude.sseBufferSizeMB) {
      throw new Error('Claude max response size must be >= SSE buffer size');
    }

    if (claude.connectionTimeoutMs < 5000) {
      throw new Error('Claude connection timeout must be at least 5 seconds');
    }

    // 驗證檔案配置
    if (files.maxFileSizeMB < 1 || files.maxFileSizeMB > 100) {
      throw new Error('File size limit must be between 1-100MB');
    }

    // 驗證效能配置
    if (performance.virtualizationThreshold < 100) {
      throw new Error('Virtualization threshold must be at least 100');
    }

    if (performance.cacheMaxAge < 60) {
      throw new Error('Cache max age must be at least 60 seconds');
    }
  }

  /**
   * 取得完整配置
   */
  public getConfig(): AppConfig {
    return { ...this.config };
  }

  /**
   * 取得 Claude 配置
   */
  public getClaudeConfig() {
    return { ...this.config.claude };
  }

  /**
   * 取得檔案配置
   */
  public getFilesConfig() {
    return { ...this.config.files };
  }

  /**
   * 取得安全配置
   */
  public getSecurityConfig() {
    return { ...this.config.security };
  }

  /**
   * 取得效能配置
   */
  public getPerformanceConfig() {
    return { ...this.config.performance };
  }

  /**
   * 取得 SSE Buffer 大小（位元組）
   */
  public getSSEBufferSize(): number {
    return this.config.claude.sseBufferSizeMB * 1024 * 1024;
  }

  /**
   * 取得檔案大小限制（位元組）
   */
  public getMaxFileSize(): number {
    return this.config.files.maxFileSizeMB * 1024 * 1024;
  }

  /**
   * 運行時更新配置（用於測試或動態調整）
   */
  public updateConfig(updates: Partial<AppConfig>): void {
    this.config = { 
      ...this.config, 
      ...updates,
      claude: { ...this.config.claude, ...updates.claude },
      files: { ...this.config.files, ...updates.files },
      security: { ...this.config.security, ...updates.security },
      performance: { ...this.config.performance, ...updates.performance },
    };
    this.validateConfig();
  }

  /**
   * 取得配置摘要（用於除錯）
   */
  public getConfigSummary(): string {
    return JSON.stringify({
      'SSE Buffer Size': `${this.config.claude.sseBufferSizeMB}MB`,
      'Max File Size': `${this.config.files.maxFileSizeMB}MB`,
      'Connection Timeout': `${this.config.claude.connectionTimeoutMs}ms`,
      'Path Validation': this.config.security.enablePathValidation ? 'Enabled' : 'Disabled',
      'Virtualization': this.config.performance.enableVirtualization ? 'Enabled' : 'Disabled',
    }, null, 2);
  }
}

// 匯出單例實例
export const appConfig = AppConfigService.getInstance();