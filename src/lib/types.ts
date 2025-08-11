export interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified: string;
  extension?: string;
  children?: FileItem[];
}

export interface DirectoryResponse {
  success: boolean;
  data: {
    path: string;
    items: FileItem[];
    totalCount?: number;
    hasMore?: boolean;
    page?: number;
    limit?: number;
  };
  error?: string;
  fallbackUsed?: boolean; // 指示是否使用了降級機制
}

export interface FileContentResponse {
  success: boolean;
  data: {
    path: string;
    content: string;
    type: string;
    encoding: string;
    size: number;
  };
  error?: string;
}

export interface FileInfoResponse {
  success: boolean;
  data: {
    path: string;
    name: string;
    size: number;
    type: string;
    modified: string;
    extension?: string;
  };
  error?: string;
}

export interface ApiError {
  success: false;
  error: string;
  code?: string;
}

// 專案管理相關類型
export interface Project {
  name: string;
  path: string;
}

export interface ProjectValidationResult extends Project {
  isValid: boolean;
  errorMessage?: string;
}

export interface ProjectConfig {
  version: string;
  projects: Project[];
}

export interface ProjectContextState {
  projects: ProjectValidationResult[];
  currentProject: ProjectValidationResult | null;
  isLoading: boolean;
  error: string | null;
}

export interface ProjectContextActions {
  loadProjects: () => Promise<void>;
  switchProject: (projectIndex: number) => Promise<void>;
  getCurrentBasePath: () => string;
}

export interface ProjectsResponse {
  success: boolean;
  data?: ProjectConfig & { projects: ProjectValidationResult[] };
  error?: string;
}

export interface AppState {
  fileTree: {
    rootPath: string;
    expandedKeys: string[];
    selectedFile: string | null;
    loading: boolean;
  };
  
  contentViewer: {
    currentFile: FileItem | null;
    content: string | null;
    loading: boolean;
    error: string | null;
  };
  
  ui: {
    sidebarWidth: number;
    collapsedSections: string[];
    theme: 'light' | 'dark';
  };

  // 專案狀態
  projects: ProjectContextState;
}