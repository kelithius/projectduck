import path from 'path';

export class SecurityService {
  private static readonly BASE_PATH = process.env.BASE_PATH || process.cwd();

  /**
   * 驗證並標準化檔案路徑，防止路徑穿越攻擊
   */
  static validatePath(requestPath: string): string {
    if (!requestPath) {
      throw new Error('Path is required');
    }

    // 移除多餘的斜線和點
    const cleanPath = requestPath.replace(/\/+/g, '/').replace(/\/\./g, '/');
    
    // 解析絕對路徑
    const resolvedPath = path.resolve(this.BASE_PATH, cleanPath);
    const resolvedBasePath = path.resolve(this.BASE_PATH);

    // 檢查路徑是否在允許的目錄範圍內
    if (!resolvedPath.startsWith(resolvedBasePath)) {
      throw new Error('Path traversal attack detected');
    }

    return resolvedPath;
  }

  /**
   * 檢查檔案路徑是否安全
   */
  static isPathSafe(requestPath: string): boolean {
    try {
      this.validatePath(requestPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 取得相對於基礎路徑的相對路徑
   */
  static getRelativePath(absolutePath: string): string {
    const resolvedBasePath = path.resolve(this.BASE_PATH);
    return path.relative(resolvedBasePath, absolutePath);
  }

  /**
   * 取得基礎路徑
   */
  static getBasePath(): string {
    return this.BASE_PATH;
  }
}