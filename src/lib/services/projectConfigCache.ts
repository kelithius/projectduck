import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { statSync } from "fs";
import chokidar, { type FSWatcher } from "chokidar";
import { ProjectConfig, ProjectValidationResult } from "@/lib/types";

/**
 * ProjectConfigCache - In-memory cache and file watching service
 *
 * Features:
 * - Monitor projects.json file changes
 * - Maintain in-memory cache of projects configuration
 * - Provide fast configuration access interface
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
   * Resolve configuration file path
   * Priority: environment variable > default value
   */
  private resolveConfigPath(): string {
    const cwd = process.cwd();

    // 1. Check environment variable
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

    // 2. Default value
    const defaultPath = join(cwd, "projects.json");
    console.log("[ProjectConfigCache] Using default config:", defaultPath);
    return defaultPath;
  }

  /**
   * Initialize cache service
   * Load initial configuration and start file watching
   */
  public initialize(): void {
    if (this.isInitialized) {
      return;
    }

    console.log("[ProjectConfigCache] Initializing...");

    // Load initial configuration
    this.loadConfig();

    // Start file watching
    this.startWatching();

    this.isInitialized = true;
    console.log("[ProjectConfigCache] Initialized successfully");
  }

  /**
   * Get projects configuration from cache
   * If cache does not exist, will attempt to reload
   * If not initialized, will auto-initialize
   */
  public getProjectsFromCache(): ProjectConfig & {
    projects: ProjectValidationResult[];
  } {
    // Ensure initialization
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
   * Check if cache is valid
   */
  public isCacheValid(): boolean {
    return this.cachedConfig !== null;
  }

  /**
   * Force reload configuration
   */
  public reloadConfig(): void {
    console.log("[ProjectConfigCache] Force reloading configuration...");
    this.loadConfig();
  }

  /**
   * Cleanup resources
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
   * Load and validate projects.json configuration
   */
  private loadConfig(): void {
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

    // Validate basic structure
    if (!config.version || !Array.isArray(config.projects)) {
      throw new Error(
        "Invalid configuration format. Missing required fields: version or projects array",
      );
    }

    // Validate each project
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

    // Update cache
    this.cachedConfig = {
      ...config,
      projects: validatedProjects,
    };

    console.log(
      `[ProjectConfigCache] Loaded ${validatedProjects.length} projects from configuration`,
    );
  }

  /**
   * Validate single project configuration
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
   * Start watching projects.json file
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
          // Keep existing cache to avoid application interruption
        }
      })
      .on("error", (error) => {
        console.error("[ProjectConfigCache] File watcher error:", error);
      });

    console.log("[ProjectConfigCache] File watcher started");
  }
}

// Create singleton instance
const projectConfigCache = new ProjectConfigCache();

export default projectConfigCache;
