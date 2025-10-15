import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { statSync } from "fs";
import chokidar, { type FSWatcher } from "chokidar";
import { ProjectConfig, ProjectValidationResult } from "@/lib/types";

/**
 * ProjectConfigCache - 記憶體快取和檔案監視服務
 *
 * 功能：
 * - 監視 projects.json 檔案變更
 * - 維護 projects 配置的記憶體快取
 * - 提供快速的配置存取介面
 */
class ProjectConfigCache {
  private cachedConfig:
    | (ProjectConfig & { projects: ProjectValidationResult[] })
    | null = null;
  private watcher: FSWatcher | null = null;
  private configPath: string;
  private isInitialized = false;

  constructor() {
    this.configPath = this.resolveConfigPath();
  }

  /**
   * 解析配置檔案路徑
   * 優先順序：環境變數 > 預設值
   */
  private resolveConfigPath(): string {
    const cwd = process.cwd();

    // 1. 檢查環境變數
    const envConfigPath =
      process.env.PROJECTS_CONFIG_PATH || process.env.PROJECTS_CONFIG;
    if (envConfigPath) {
      const resolvedPath = envConfigPath.startsWith("/")
        ? envConfigPath
        : join(cwd, envConfigPath);
      console.log(
        "[ProjectConfigCache] Using environment config:",
        resolvedPath,
      );
      return resolvedPath;
    }

    // 2. 預設值
    const defaultPath = join(cwd, "projects.json");
    console.log("[ProjectConfigCache] Using default config:", defaultPath);
    return defaultPath;
  }

  /**
   * 初始化快取服務
   * 載入初始配置並開始監視檔案
   */
  public initialize(): void {
    if (this.isInitialized) {
      return;
    }

    console.log("[ProjectConfigCache] Initializing...");

    try {
      // 載入初始配置
      this.loadConfig();

      // 開始監視檔案
      this.startWatching();

      this.isInitialized = true;
      console.log("[ProjectConfigCache] Initialized successfully");
    } catch (error) {
      console.error("[ProjectConfigCache] Initialization failed:", error);
      throw error;
    }
  }

  /**
   * 從快取獲取 projects 配置
   * 如果快取不存在，會嘗試重新載入
   * 如果未初始化，會自動初始化
   */
  public getProjectsFromCache(): ProjectConfig & {
    projects: ProjectValidationResult[];
  } {
    // 確保已初始化
    if (!this.isInitialized) {
      console.log("[ProjectConfigCache] Auto-initializing...");
      this.initialize();
    }

    if (!this.cachedConfig) {
      console.log("[ProjectConfigCache] Cache miss, reloading...");
      this.loadConfig();
    }

    if (!this.cachedConfig) {
      throw new Error("Failed to load projects configuration");
    }

    return this.cachedConfig;
  }

  /**
   * 檢查快取是否可用
   */
  public isCacheValid(): boolean {
    return this.cachedConfig !== null;
  }

  /**
   * 強制重新載入配置
   */
  public reloadConfig(): void {
    console.log("[ProjectConfigCache] Force reloading configuration...");
    this.loadConfig();
  }

  /**
   * 清理資源
   */
  public cleanup(): void {
    if (this.watcher) {
      console.log("[ProjectConfigCache] Cleaning up watcher...");
      this.watcher.close();
      this.watcher = null;
    }
    this.cachedConfig = null;
    this.isInitialized = false;
  }

  /**
   * 載入並驗證 projects.json 配置
   */
  private loadConfig(): void {
    try {
      if (!existsSync(this.configPath)) {
        throw new Error("projects.json configuration file not found");
      }

      const configContent = readFileSync(this.configPath, "utf-8");
      let config: ProjectConfig;

      try {
        config = JSON.parse(configContent);
      } catch {
        throw new Error("Invalid JSON format in projects.json");
      }

      // 驗證基本結構
      if (!config.version || !Array.isArray(config.projects)) {
        throw new Error(
          "Invalid configuration format. Missing required fields: version or projects array",
        );
      }

      // 驗證每個專案
      const validatedProjects: ProjectValidationResult[] = config.projects.map(
        (project) => {
          const validation = this.validateProject(project);
          return {
            ...project,
            isValid: validation.isValid,
            errorMessage: validation.errorMessage,
          };
        },
      );

      // 更新快取
      this.cachedConfig = {
        ...config,
        projects: validatedProjects,
      };

      console.log(
        `[ProjectConfigCache] Loaded ${validatedProjects.length} projects from configuration`,
      );
    } catch (error) {
      console.error(
        "[ProjectConfigCache] Failed to load configuration:",
        error,
      );
      this.cachedConfig = null;
      throw error;
    }
  }

  /**
   * 驗證單個專案配置
   */
  private validateProject(project: unknown): {
    isValid: boolean;
    errorMessage?: string;
  } {
    if (!project || typeof project !== "object") {
      return { isValid: false, errorMessage: "Project must be an object" };
    }

    const proj = project as Record<string, unknown>;
    if (!proj.name || typeof proj.name !== "string") {
      return {
        isValid: false,
        errorMessage: "Project name is required and must be a string",
      };
    }

    if (!proj.path || typeof proj.path !== "string") {
      return {
        isValid: false,
        errorMessage: "Project path is required and must be a string",
      };
    }

    try {
      if (!existsSync(proj.path as string)) {
        return {
          isValid: false,
          errorMessage: "Project directory does not exist",
        };
      }

      const stats = statSync(proj.path as string);
      if (!stats.isDirectory()) {
        return {
          isValid: false,
          errorMessage: "Project path is not a directory",
        };
      }
    } catch {
      return {
        isValid: false,
        errorMessage: "Cannot access project directory",
      };
    }

    return { isValid: true };
  }

  /**
   * 開始監視 projects.json 檔案
   */
  private startWatching(): void {
    if (this.watcher) {
      return;
    }

    console.log("[ProjectConfigCache] Starting file watcher...");

    // Use native file system events by default (inotify/FSEvents/ReadDirectoryChangesW)
    // Falls back to polling mode if FORCE_POLLING=true (useful for Docker/NFS environments)
    const usePolling = process.env.FORCE_POLLING === "true";

    this.watcher = chokidar.watch(this.configPath, {
      persistent: true,
      ignoreInitial: true, // Ignore initial events during initialization
      atomic: true, // Handle atomic writes
      usePolling: usePolling,
      interval: 200, // Polling interval (only used if usePolling=true)
      binaryInterval: 300, // Binary file polling interval
      awaitWriteFinish: {
        stabilityThreshold: 100, // Wait time after file stops changing
        pollInterval: 50,
      },
    });

    console.log(
      `[ProjectConfigCache] File watching mode: ${usePolling ? "polling" : "native events (inotify/FSEvents/ReadDirectoryChangesW)"}`,
    );

    this.watcher
      .on("change", () => {
        console.log("[ProjectConfigCache] projects.json changed, reloading...");
        try {
          this.loadConfig();
          console.log(
            "[ProjectConfigCache] Configuration reloaded successfully",
          );
        } catch (error) {
          console.error(
            "[ProjectConfigCache] Failed to reload configuration:",
            error,
          );
          // 保持原有快取，避免應用中斷
        }
      })
      .on("error", (error) => {
        console.error("[ProjectConfigCache] File watcher error:", error);
      });

    console.log("[ProjectConfigCache] File watcher started");
  }
}

// 建立單例實例
const projectConfigCache = new ProjectConfigCache();

export default projectConfigCache;
