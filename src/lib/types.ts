export interface FileItem {
  name: string;
  path: string;
  type: "file" | "directory";
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

// Project management related types
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

// File watching related types
export type FileWatchStatus =
  | "watching" // Currently watching
  | "changed" // File has been changed, waiting for reload
  | "deleted" // File has been deleted
  | "moved" // File has been moved
  | "error" // Watching error
  | "idle"; // Not watching state

export interface FileWatchInfo {
  status: FileWatchStatus;
  lastModified?: number;
  error?: string;
  newPath?: string; // New path when file is moved
}

// Directory watching related types
export type DirectoryWatchEventType =
  | "connected" // SSE connection established
  | "add" // File added
  | "addDir" // Directory added
  | "change" // File changed
  | "unlink" // File deleted
  | "unlinkDir" // Directory deleted
  | "error" // Watching error
  | "heartbeat"; // Heartbeat signal

export interface DirectoryWatchEvent {
  type: DirectoryWatchEventType;
  path?: string; // Full path
  relativePath?: string; // Path relative to the watch root directory
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

// Directory watcher configuration
export interface DirectoryWatcherConfig {
  basePath: string; // Base path for watching
  targetPath: string; // Target sub-path (relative to basePath)
  recursive: boolean; // Whether to watch recursively
  callback: DirectoryWatchCallback;
}

// Tree node operation types
export type TreeNodeOperation =
  | "add" // Add node
  | "remove" // Remove node
  | "update" // Update node
  | "move"; // Move node

export interface TreeNodeOperationData {
  operation: TreeNodeOperation;
  parentKey: string; // Parent node key
  nodeKey: string; // Node key
  nodeData?: FileItem; // Node data (used when adding/updating)
  newParentKey?: string; // New parent node key (used when moving)
  newNodeKey?: string; // New node key (used when renaming)
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
    // File watching status
    watchInfo: FileWatchInfo;
  };

  ui: {
    sidebarWidth: number;
    collapsedSections: string[];
    theme: "light" | "dark";
  };

  // Project state
  projects: ProjectContextState;
}
