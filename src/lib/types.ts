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

// 檔案監控相關類型
export type FileWatchStatus = 
  | 'watching'    // 正在監控
  | 'changed'     // 檔案已變更，等待重新載入
  | 'deleted'     // 檔案已刪除
  | 'moved'       // 檔案已移動
  | 'error'       // 監控錯誤
  | 'idle';       // 未監控狀態

export interface FileWatchInfo {
  status: FileWatchStatus;
  lastModified?: number;
  error?: string;
  newPath?: string;  // 檔案移動時的新路徑
}

// 目錄監控相關類型
export type DirectoryWatchEventType = 
  | 'connected'   // SSE 連接建立
  | 'add'         // 檔案新增
  | 'addDir'      // 資料夾新增
  | 'change'      // 檔案變更
  | 'unlink'      // 檔案刪除
  | 'unlinkDir'   // 資料夾刪除
  | 'error'       // 監控錯誤
  | 'heartbeat';  // 心跳訊號

export interface DirectoryWatchEvent {
  type: DirectoryWatchEventType;
  path?: string;          // 完整路徑
  relativePath?: string;  // 相對於監控根目錄的路徑
  stats?: {
    isFile: boolean;
    isDirectory: boolean;
    size?: number;
    modified?: string;
  };
  error?: string;
  timestamp: number;
}

export type DirectoryWatchCallback = (event: DirectoryWatchEvent) => void;

// 目錄監控器配置
export interface DirectoryWatcherConfig {
  basePath: string;           // 監控的基礎路徑
  targetPath: string;         // 目標子路徑（相對於 basePath）
  recursive: boolean;         // 是否遞迴監控
  callback: DirectoryWatchCallback;
}

// Tree 節點操作類型
export type TreeNodeOperation = 
  | 'add'       // 新增節點
  | 'remove'    // 移除節點
  | 'update'    // 更新節點
  | 'move';     // 移動節點

export interface TreeNodeOperationData {
  operation: TreeNodeOperation;
  parentKey: string;        // 父節點的 key
  nodeKey: string;          // 節點的 key
  nodeData?: FileItem;      // 節點資料（新增/更新時使用）
  newParentKey?: string;    // 新父節點 key（移動時使用）
  newNodeKey?: string;      // 新節點 key（重新命名時使用）
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
    // 新增檔案監控狀態
    watchInfo: FileWatchInfo;
  };
  
  ui: {
    sidebarWidth: number;
    collapsedSections: string[];
    theme: 'light' | 'dark';
  };

  // 專案狀態
  projects: ProjectContextState;
}