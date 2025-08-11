import path from 'path';

export class SecurityService {
  static validatePath(requestPath: string = '', basePath: string): string {
    const cleanPath = requestPath 
      ? requestPath.replace(/\/+/g, '/').replace(/\/\./g, '/') 
      : '';
    
    const resolvedPath = path.resolve(basePath, cleanPath);
    const resolvedBasePath = path.resolve(basePath);

    if (!resolvedPath.startsWith(resolvedBasePath)) {
      throw new Error('Path traversal attack detected');
    }

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
}