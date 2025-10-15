import fs from "fs-extra";
import path from "path";
import mime from "mime-types";
import { FileItem } from "@/lib/types";
import { appConfig } from "@/lib/services/appConfigService";

interface FileContentData {
  path: string;
  content: string;
  type: string;
  encoding: string;
  size: number;
}

export class ProjectAwareFileService {
  // Project-aware directory content retrieval
  static async getDirectoryContentsWithBasePath(
    requestPath: string = "",
    page: number = 1,
    limit: number = 100,
    basePath?: string,
  ): Promise<{ items: FileItem[]; totalCount: number; hasMore: boolean }> {
    if (!basePath) {
      throw new Error("Base path is required");
    }

    const effectiveBasePath = basePath;

    const fullPath = requestPath
      ? path.join(effectiveBasePath, requestPath)
      : effectiveBasePath;
    const safePath = this.validateProjectPath(fullPath, effectiveBasePath);

    const stats = await fs.stat(safePath);

    if (!stats.isDirectory()) {
      throw new Error("Path is not a directory");
    }

    const items = await fs.readdir(safePath);
    const fileItems: FileItem[] = [];

    for (const item of items) {
      const itemPath = path.join(safePath, item);
      const itemStats = await fs.stat(itemPath);
      const relativePath = path.relative(effectiveBasePath, itemPath);

      const fileItem: FileItem = {
        name: item,
        path: relativePath || ".",
        type: itemStats.isDirectory() ? "directory" : "file",
        size: itemStats.isFile() ? itemStats.size : undefined,
        modified: itemStats.mtime.toISOString(),
        extension: itemStats.isFile()
          ? path.extname(item).toLowerCase().slice(1)
          : undefined,
      };

      fileItems.push(fileItem);
    }

    // Sort: directories first, then by name
    fileItems.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "directory" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    // Pagination handling
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedItems = fileItems.slice(startIndex, endIndex);

    return {
      items: paginatedItems,
      totalCount: fileItems.length,
      hasMore: endIndex < fileItems.length,
    };
  }

  // Validate project path
  private static validateProjectPath(
    fullPath: string,
    basePath: string,
  ): string {
    // Ensure path is within basePath scope
    const resolvedFullPath = path.resolve(fullPath);
    const resolvedBasePath = path.resolve(basePath);

    if (!resolvedFullPath.startsWith(resolvedBasePath)) {
      throw new Error("Access denied: Path is outside the allowed directory");
    }

    return resolvedFullPath;
  }

  // Validate if project path is accessible
  static async validateProjectAccess(projectPath: string): Promise<{
    isValid: boolean;
    error?: string;
    isDirectory?: boolean;
  }> {
    try {
      const stats = await fs.stat(projectPath);

      if (!stats.isDirectory()) {
        return {
          isValid: false,
          error: "Path is not a directory",
          isDirectory: false,
        };
      }

      // Attempt to read directory contents to confirm permissions
      await fs.readdir(projectPath);

      return {
        isValid: true,
        isDirectory: true,
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : "Unknown error",
        isDirectory: false,
      };
    }
  }

  // Perform health check for project path
  static async healthCheckProject(projectPath: string): Promise<{
    healthy: boolean;
    readable: boolean;
    writable: boolean;
    error?: string;
  }> {
    try {
      // Check if readable
      await fs.access(projectPath, fs.constants.R_OK);
      const readable = true;

      // Check if writable (not required, but helps with completeness check)
      let writable = false;
      try {
        await fs.access(projectPath, fs.constants.W_OK);
        writable = true;
      } catch {
        // Write permission is not required, ignore error
      }

      // Check if it's a directory and contents can be listed
      const stats = await fs.stat(projectPath);
      if (!stats.isDirectory()) {
        return {
          healthy: false,
          readable: false,
          writable: false,
          error: "Path is not a directory",
        };
      }

      await fs.readdir(projectPath);

      return {
        healthy: true,
        readable,
        writable,
      };
    } catch (error) {
      return {
        healthy: false,
        readable: false,
        writable: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Project-aware file content retrieval
  static async getFileContent(
    requestPath: string,
    basePath: string,
  ): Promise<FileContentData> {
    if (!basePath) {
      throw new Error("Base path is required");
    }

    const effectiveBasePath = basePath;
    const fullPath = path.join(effectiveBasePath, requestPath);
    const safePath = this.validateProjectPath(fullPath, effectiveBasePath);

    const stats = await fs.stat(safePath);

    if (!stats.isFile()) {
      throw new Error("Path is not a file");
    }

    const maxSize = appConfig.getMaxFileSize();
    const maxSizeMB = maxSize / (1024 * 1024);
    if (stats.size > maxSize) {
      throw new Error(`File too large (max ${maxSizeMB}MB)`);
    }

    const mimeType = mime.lookup(safePath) || "text/plain";
    const content = await fs.readFile(safePath, "utf-8");

    return {
      path: requestPath,
      content,
      type: mimeType,
      encoding: "utf-8",
      size: stats.size,
    };
  }
}
