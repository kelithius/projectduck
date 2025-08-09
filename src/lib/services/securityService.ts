import path from 'path';

export class SecurityService {
  private static get BASE_PATH(): string {
    return process.env.BASE_PATH || process.cwd();
  }

  static validatePath(requestPath: string = ''): string {
    const cleanPath = requestPath 
      ? requestPath.replace(/\/+/g, '/').replace(/\/\./g, '/') 
      : '';
    
    const resolvedPath = path.resolve(this.BASE_PATH, cleanPath);
    const resolvedBasePath = path.resolve(this.BASE_PATH);

    if (!resolvedPath.startsWith(resolvedBasePath)) {
      throw new Error('Path traversal attack detected');
    }

    return resolvedPath;
  }

  static isPathSafe(requestPath: string): boolean {
    try {
      this.validatePath(requestPath);
      return true;
    } catch {
      return false;
    }
  }

  static getRelativePath(absolutePath: string): string {
    const resolvedBasePath = path.resolve(this.BASE_PATH);
    return path.relative(resolvedBasePath, absolutePath);
  }

  static getBasePath(): string {
    return this.BASE_PATH;
  }
}