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
}