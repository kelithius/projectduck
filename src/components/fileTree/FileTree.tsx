"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Tree, Spin, Input, App } from "antd";
import type { InputRef } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import type { DataNode } from "antd/es/tree";

interface ExtendedTreeDataNode extends DataNode {
  data?: FileItem;
}

type TreeDataNode = ExtendedTreeDataNode;
import { useTranslation } from "react-i18next";
import {
  FileItem,
  DirectoryWatchEvent,
  TreeNodeOperationData,
} from "@/lib/types";
import apiService from "@/lib/services/api";
import { cacheService } from "@/lib/services/cache";
import { useProject } from "@/lib/providers/project-provider";
import { FileIcon } from "./FileIcon";
import directoryWatcher from "@/lib/services/directoryWatcher";
import styles from "./FileTree.module.css";

interface FileTreeProps {
  onFileSelect: (file: FileItem | null) => void;
  selectedFile?: FileItem | null; // Currently selected file
  darkMode?: boolean;
  resetTrigger?: number; // Prop used to trigger reset
}

const FileTreeComponent: React.FC<FileTreeProps> = ({
  onFileSelect,
  selectedFile,
  darkMode = false,
  resetTrigger,
}) => {
  const { message } = App.useApp();
  const { t } = useTranslation();
  const {
    getCurrentBasePath,
    currentProject,
    isLoading: projectLoading,
  } = useProject();
  const [treeData, setTreeData] = useState<TreeDataNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [autoExpandParent, setAutoExpandParent] = useState(true);
  const [loadingNodes, setLoadingNodes] = useState<Set<string>>(new Set());
  const [operationInProgress, setOperationInProgress] = useState<string | null>(
    null,
  );
  const [isWatchingDirectory, setIsWatchingDirectory] = useState(false);
  const searchInputRef = useRef<InputRef>(null);
  const watchCleanupRef = useRef<(() => void) | null>(null);

  const fileItemToTreeNode = (item: FileItem): TreeDataNode => {
    return {
      title: item.name,
      key: item.path,
      isLeaf: item.type === "file",
      children: item.children?.map(fileItemToTreeNode),
      data: item,
    };
  };

  const titleRender = (nodeData: TreeDataNode & { data?: FileItem }) => {
    const item = nodeData.data;
    if (!item) return null;
    const isExpanded = expandedKeys.includes(nodeData.key?.toString() || "");
    const isSelected = selectedFile && selectedFile.path === item.path;

    const handleTitleClick = async (e: React.MouseEvent) => {
      e.stopPropagation();

      const operationKey = `${item.type}-${item.path}`;
      if (
        operationInProgress === operationKey ||
        loadingNodes.has(nodeData.key?.toString() || "")
      ) {
        return;
      }

      if (item.type === "file") {
        setOperationInProgress(operationKey);
        onFileSelect(item);
        setTimeout(() => setOperationInProgress(null), 100);
      } else {
        if (isExpanded) {
          setExpandedKeys((prev) =>
            prev.filter((key) => key !== nodeData.key?.toString()),
          );
        } else {
          setLoadingNodes(
            (prev) => new Set([...prev, nodeData.key?.toString() || ""]),
          );
          setOperationInProgress(operationKey);

          setExpandedKeys((prev) => [...prev, nodeData.key?.toString() || ""]);
          if (!nodeData.children || nodeData.children.length === 0) {
            try {
              await onLoadData(nodeData);
            } finally {
              setLoadingNodes((prev) => {
                const newSet = new Set(prev);
                newSet.delete(nodeData.key?.toString() || "");
                return newSet;
              });
              setOperationInProgress(null);
            }
          } else {
            setLoadingNodes((prev) => {
              const newSet = new Set(prev);
              newSet.delete(nodeData.key?.toString() || "");
              return newSet;
            });
            setOperationInProgress(null);
          }
        }
        setAutoExpandParent(false);
      }
    };

    const isLoading = loadingNodes.has(nodeData.key?.toString() || "");

    // Highlight search text
    const renderHighlightText = (text: string, searchTerm: string) => {
      if (!searchTerm) return text;

      const index = text.toLowerCase().indexOf(searchTerm.toLowerCase());
      if (index === -1) return text;

      return (
        <>
          {text.substring(0, index)}
          <span
            style={{
              backgroundColor: darkMode ? "#faad14" : "#ffeb3b",
              color: darkMode ? "#000" : "#000",
              fontWeight: "bold",
              padding: "0 2px",
              borderRadius: "2px",
            }}
          >
            {text.substring(index, index + searchTerm.length)}
          </span>
          {text.substring(index + searchTerm.length)}
        </>
      );
    };

    return (
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          cursor: isLoading ? "wait" : "pointer",
          width: "100%",
          opacity: isLoading ? 0.7 : 1,
        }}
        onClick={handleTitleClick}
      >
        <FileIcon type={item.type} extension={item.extension} />
        <span
          style={{
            fontWeight: isSelected ? "bold" : "normal",
            color: isSelected ? (darkMode ? "#1890ff" : "#1890ff") : "inherit",
          }}
        >
          {renderHighlightText(item.name, searchValue)}
        </span>
        {isLoading && (
          <span
            style={{
              marginLeft: "4px",
              fontSize: "10px",
              color: "#1890ff",
            }}
          >
            {t("status.loading")}
          </span>
        )}
      </span>
    );
  };

  // Stop directory watching
  const stopDirectoryWatch = useCallback(() => {
    if (watchCleanupRef.current) {
      console.log("[FileTree] Stopping directory watch");
      watchCleanupRef.current();
      watchCleanupRef.current = null;
    }
    setIsWatchingDirectory(false);
  }, []);

  const resetFileTree = useCallback(() => {
    // Stop directory monitoring
    stopDirectoryWatch();

    setTreeData([]);
    setExpandedKeys([]);
    setSearchValue("");
    setAutoExpandParent(true);
    setLoadingNodes(new Set());
    setOperationInProgress(null);

    // Clear selected file on reset
    onFileSelect(null);
  }, [onFileSelect, stopDirectoryWatch]);

  const loadRootDirectory = useCallback(async () => {
    try {
      setLoading(true);

      // Ensure getCurrentBasePath returns a string instead of Promise
      let currentBasePath: string;
      try {
        currentBasePath = getCurrentBasePath();
      } catch (error) {
        console.error("Error getting base path:", error);
        message.error(t("fileTree.noProject", "沒有可用的專案"));
        return;
      }

      if (!currentBasePath) {
        message.error(t("fileTree.noProject", "沒有可用的專案"));
        return;
      }

      const response = await apiService.getDirectory("", currentBasePath);

      if (response.success) {
        const nodes = response.data.items.map(fileItemToTreeNode);
        setTreeData(nodes);
      } else {
        message.error(response.error || t("fileTree.loadingError"));
      }
    } catch (error) {
      message.error(t("fileTree.loadingError"));
      console.error("Failed to load directory:", error);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getCurrentBasePath, message, t]);

  const onLoadData = useCallback(
    async (node: TreeDataNode): Promise<void> => {
      const { key } = node;

      try {
        // Ensure getCurrentBasePath returns a string instead of Promise
        let currentBasePath: string;
        try {
          currentBasePath = getCurrentBasePath();
        } catch (error) {
          console.error("Error getting base path:", error);
          message.error(t("fileTree.noProject", "沒有可用的專案"));
          return;
        }

        if (!currentBasePath) {
          message.error(t("fileTree.noProject", "沒有可用的專案"));
          return;
        }

        const response = await apiService.getDirectory(
          key as string,
          currentBasePath,
        );

        if (response.success) {
          const childNodes = response.data.items.map(fileItemToTreeNode);

          setTreeData((prevData) =>
            updateTreeData(prevData, key as string, childNodes),
          );
        } else {
          message.error(response.error || t("fileTree.loadingError"));
        }
      } catch (error) {
        message.error(t("fileTree.loadingError"));
        console.error("Failed to load subdirectory:", error);
      }
    },
    [getCurrentBasePath, message, t],
  );

  const updateTreeData = (
    list: TreeDataNode[],
    key: string,
    children: TreeDataNode[],
  ): TreeDataNode[] => {
    return list.map((node) => {
      if (node.key === key) {
        return { ...node, children };
      }
      if (node.children) {
        return {
          ...node,
          children: updateTreeData(node.children, key, children),
        };
      }
      return node;
    });
  };

  const onSearch = useCallback(
    (value: string) => {
      setSearchValue(value);
      if (!value) {
        setExpandedKeys([]);
        setAutoExpandParent(false);
        return;
      }

      const expandKeys: string[] = [];
      const searchInTree = (nodes: TreeDataNode[], parentKey?: string) => {
        nodes.forEach((node) => {
          const nodeTitle =
            node.data?.name ||
            (typeof node.title === "string"
              ? node.title
              : (node.key as string));

          if (
            nodeTitle &&
            nodeTitle.toLowerCase().includes(value.toLowerCase())
          ) {
            // Found match, expand all parent paths
            if (parentKey && !expandKeys.includes(parentKey)) {
              expandKeys.push(parentKey);
            }
            // If match is a directory, also expand the directory itself
            if (
              node.data?.type === "directory" &&
              !expandKeys.includes(node.key as string)
            ) {
              expandKeys.push(node.key as string);
            }
          }

          if (node.children) {
            searchInTree(node.children, node.key as string);
          }
        });
      };

      searchInTree(treeData);
      setExpandedKeys(expandKeys);
      setAutoExpandParent(true);
    },
    [treeData],
  );

  const onExpand = useCallback((newExpandedKeys: React.Key[]) => {
    setExpandedKeys(newExpandedKeys as string[]);
    setAutoExpandParent(false);
  }, []);

  // Smart update tree node - maintain expanded state
  const smartUpdateTreeNode = useCallback(
    (operation: TreeNodeOperationData) => {
      const {
        operation: op,
        parentKey,
        nodeKey,
        nodeData,
        newParentKey,
        newNodeKey,
      } = operation;

      console.log(`[FileTree] Smart update: ${op} for ${nodeKey}`, operation);

      setTreeData((prevData) => {
        switch (op) {
          case "add":
            if (!nodeData) return prevData;
            return addNodeToTree(prevData, parentKey, nodeData);

          case "remove":
            return removeNodeFromTree(prevData, nodeKey);

          case "update":
            if (!nodeData) return prevData;
            return updateNodeInTree(prevData, nodeKey, nodeData);

          case "move":
            if (!newParentKey) return prevData;
            return moveNodeInTree(
              prevData,
              nodeKey,
              parentKey,
              newParentKey,
              newNodeKey,
            );

          default:
            return prevData;
        }
      });
    },
    [],
  );

  // Add node to tree
  const addNodeToTree = (
    nodes: TreeDataNode[],
    parentKey: string,
    nodeData: FileItem,
  ): TreeDataNode[] => {
    if (parentKey === "") {
      // Add to root level
      const newNode = fileItemToTreeNode(nodeData);
      return [...nodes, newNode].sort((a: TreeDataNode, b: TreeDataNode) => {
        // Directories first, files second, alphabetical order within same type
        const aIsDir = a.data?.type === "directory";
        const bIsDir = b.data?.type === "directory";
        if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
        return (a.data?.name || "").localeCompare(b.data?.name || "");
      });
    }

    return nodes.map((node) => {
      if (node.key === parentKey) {
        const newNode = fileItemToTreeNode(nodeData);
        const updatedChildren = [...(node.children || []), newNode].sort(
          (a: TreeDataNode, b: TreeDataNode) => {
            const aIsDir = a.data?.type === "directory";
            const bIsDir = b.data?.type === "directory";
            if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
            return (a.data?.name || "").localeCompare(b.data?.name || "");
          },
        );
        return { ...node, children: updatedChildren };
      }

      if (node.children) {
        return {
          ...node,
          children: addNodeToTree(node.children, parentKey, nodeData),
        };
      }

      return node;
    });
  };

  // Remove node from tree
  const removeNodeFromTree = (
    nodes: TreeDataNode[],
    nodeKey: string,
  ): TreeDataNode[] => {
    return nodes.filter((node) => {
      if (node.key === nodeKey) {
        return false; // Remove this node
      }

      if (node.children) {
        node.children = removeNodeFromTree(node.children, nodeKey);
      }

      return true;
    });
  };

  // Update node in tree
  const updateNodeInTree = (
    nodes: TreeDataNode[],
    nodeKey: string,
    nodeData: FileItem,
  ): TreeDataNode[] => {
    return nodes.map((node) => {
      if (node.key === nodeKey) {
        // Update node data while maintaining other properties
        return {
          ...node,
          title: nodeData.name,
          data: nodeData,
        };
      }

      if (node.children) {
        return {
          ...node,
          children: updateNodeInTree(node.children, nodeKey, nodeData),
        };
      }

      return node;
    });
  };

  // Move node in tree
  const moveNodeInTree = (
    nodes: TreeDataNode[],
    nodeKey: string,
    oldParentKey: string,
    newParentKey: string,
    newNodeKey?: string,
  ): TreeDataNode[] => {
    // First find the node to move
    let nodeToMove: TreeDataNode | null = null;

    const findAndRemoveNode = (
      currentNodes: TreeDataNode[],
    ): TreeDataNode[] => {
      return currentNodes.filter((node) => {
        if (node.key === nodeKey) {
          nodeToMove = node;
          return false;
        }

        if (node.children) {
          node.children = findAndRemoveNode(node.children);
        }

        return true;
      });
    };

    let updatedNodes = findAndRemoveNode([...nodes]);

    // If node was found, add it to new location
    if (nodeToMove && (nodeToMove as TreeDataNode).data) {
      const node = nodeToMove as TreeDataNode;
      // Update node key (if renamed)
      if (newNodeKey) {
        nodeToMove = {
          ...node,
          key: newNodeKey,
          title: node.data!.name,
        };
      }

      updatedNodes = addNodeToTree(updatedNodes, newParentKey, node.data!);
    }

    return updatedNodes;
  };

  // Auto-expand to selected file path
  const expandToSelectedFile = useCallback((selectedFilePath: string) => {
    if (!selectedFilePath) return;

    // Get all parent directories of file path
    const pathParts = selectedFilePath.split("/");
    const expandKeys: string[] = [];

    let currentPath = "";
    for (let i = 0; i < pathParts.length - 1; i++) {
      if (currentPath) {
        currentPath += "/" + pathParts[i];
      } else {
        currentPath = pathParts[i];
      }
      expandKeys.push(currentPath);
    }

    if (expandKeys.length > 0) {
      console.log(
        "[FileTree] Expanding to selected file:",
        selectedFilePath,
        "expand keys:",
        expandKeys,
      );
      setExpandedKeys((prevKeys) => {
        const newKeys = [...new Set([...prevKeys, ...expandKeys])];
        return newKeys;
      });
    }
  }, []);

  // Handle directory change events
  const handleDirectoryWatchEvent = useCallback(
    (event: DirectoryWatchEvent) => {
      console.log(`[FileTree] handleDirectoryWatchEvent called with:`, event);

      const { type, relativePath, stats } = event;

      if (!relativePath || relativePath === "") {
        console.log(
          `[FileTree] Ignoring event with empty relativePath:`,
          event,
        );
        return;
      }

      console.log(
        `[FileTree] Processing directory event: ${type} for ${relativePath}`,
        event,
      );

      // Clear related API cache
      if (relativePath) {
        const basePath = getCurrentBasePath();
        const parentPath = relativePath.includes("/")
          ? relativePath.substring(0, relativePath.lastIndexOf("/"))
          : "";

        // Clear current directory cache
        const cacheKey = basePath
          ? `directory:${basePath}:${relativePath}`
          : `directory:${relativePath}`;
        cacheService.delete(cacheKey);

        // Clear parent directory cache (if exists)
        if (parentPath) {
          const parentCacheKey = basePath
            ? `directory:${basePath}:${parentPath}`
            : `directory:${parentPath}`;
          cacheService.delete(parentCacheKey);
        } else {
          // If no parent directory, clear root directory cache
          const rootCacheKey = basePath
            ? `directory:${basePath}:`
            : `directory:`;
          cacheService.delete(rootCacheKey);
        }
      }

      const parentPath = relativePath.includes("/")
        ? relativePath.substring(0, relativePath.lastIndexOf("/"))
        : "";
      const fileName = relativePath.includes("/")
        ? relativePath.substring(relativePath.lastIndexOf("/") + 1)
        : relativePath;

      try {
        const basePath = getCurrentBasePath();
        const _fullPath = basePath
          ? `${basePath}/${relativePath}`
          : relativePath;

        switch (type) {
          case "add":
          case "addDir":
            if (stats) {
              const newFileItem: FileItem = {
                name: fileName,
                path: relativePath,
                type: stats.isDirectory ? "directory" : "file",
                size: stats.size,
                modified: stats.modified || new Date().toISOString(),
                extension:
                  stats.isFile && fileName.includes(".")
                    ? fileName.split(".").pop()
                    : undefined,
                children: stats.isDirectory ? [] : undefined,
              };

              smartUpdateTreeNode({
                operation: "add",
                parentKey: parentPath,
                nodeKey: relativePath,
                nodeData: newFileItem,
              });

              // If a file is currently selected, ensure expand state is correct
              if (selectedFile) {
                setTimeout(() => expandToSelectedFile(selectedFile.path), 100);
              }
            }
            break;

          case "unlink":
          case "unlinkDir":
            // If deleted file is the currently selected file, clear selection
            if (selectedFile && selectedFile.path === relativePath) {
              onFileSelect(null);
            }

            smartUpdateTreeNode({
              operation: "remove",
              parentKey: parentPath,
              nodeKey: relativePath,
            });
            break;

          case "change":
            // File content changed, update modification time
            if (stats) {
              const updatedFileItem: FileItem = {
                name: fileName,
                path: relativePath,
                type: "file",
                size: stats.size,
                modified: stats.modified || new Date().toISOString(),
                extension: fileName.includes(".")
                  ? fileName.split(".").pop()
                  : undefined,
              };

              smartUpdateTreeNode({
                operation: "update",
                parentKey: parentPath,
                nodeKey: relativePath,
                nodeData: updatedFileItem,
              });
            }
            break;

          case "error":
            console.error(`[FileTree] Directory watch error:`, event.error);
            message.error(`檔案監控錯誤: ${event.error}`);
            break;
        }
      } catch (error) {
        console.error(`[FileTree] Error handling directory event:`, error);
      }
    },
    [getCurrentBasePath, message, smartUpdateTreeNode],
  );

  // Start directory watching
  const startDirectoryWatch = useCallback(() => {
    if (isWatchingDirectory || !currentProject) return;

    try {
      const basePath = getCurrentBasePath();
      if (!basePath) {
        console.warn("[FileTree] Cannot start directory watch: no basePath");
        return;
      }

      console.log("[FileTree] Starting directory watch for:", basePath);

      const cleanup = directoryWatcher.watchDirectory({
        basePath,
        targetPath: "", // Watch root directory
        recursive: true,
        callback: handleDirectoryWatchEvent,
      });

      watchCleanupRef.current = cleanup;
      setIsWatchingDirectory(true);
    } catch (error) {
      console.error("[FileTree] Failed to start directory watch:", error);
    }
  }, [
    isWatchingDirectory,
    currentProject,
    getCurrentBasePath,
    handleDirectoryWatchEvent,
  ]);

  useEffect(() => {
    let isCancelled = false;

    const loadRoot = async () => {
      // Wait for project to finish loading
      if (projectLoading) {
        // Project still loading, ensure loading state is displayed
        setLoading(true);
        return;
      }

      // Handle after project loading completes
      if (!isCancelled && currentProject) {
        // Project available, load directory
        await loadRootDirectory();

        // Start directory watching after loading completes
        if (!isCancelled) {
          startDirectoryWatch();
        }
      } else if (!isCancelled && !currentProject) {
        // Show error when project loading completes but no project available
        setLoading(false);
        message.error(t("fileTree.noProject", "沒有可用的專案"));

        // Stop any existing directory watching
        stopDirectoryWatch();
      }
    };

    loadRoot();

    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectLoading, currentProject, startDirectoryWatch, stopDirectoryWatch]);

  // Listen to resetTrigger changes
  useEffect(() => {
    if (resetTrigger !== undefined) {
      resetFileTree();
      // Don't use setTimeout, let React's state update cycle handle it
      // loadRootDirectory will be triggered in main useEffect
    }
  }, [resetTrigger, resetFileTree]);

  // Listen to project change events
  useEffect(() => {
    const handleProjectChange = () => {
      resetFileTree();
      // Don't use setTimeout, let React's state update cycle handle it
      // loadRootDirectory will be triggered in main useEffect
    };

    window.addEventListener("projectChange", handleProjectChange);

    return () => {
      window.removeEventListener("projectChange", handleProjectChange);
    };
  }, [resetFileTree]);

  // Cleanup watcher on component unmount
  useEffect(() => {
    return () => {
      stopDirectoryWatch();
    };
  }, [stopDirectoryWatch]);

  if (loading) {
    return (
      <div
        style={{
          padding: "20px",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Spin />
      </div>
    );
  }

  return (
    <div className={styles.fileTreeContainer}>
      <div className={styles.searchWrapper}>
        <Input
          ref={searchInputRef}
          placeholder={t("fileTree.searchPlaceholder")}
          allowClear={true}
          value={searchValue}
          onChange={(e) => onSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              onSearch("");
            }
          }}
          prefix={<SearchOutlined />}
        />
      </div>

      <div className={`${styles.cardContainer} ${darkMode ? styles.dark : ""}`}>
        <div className={styles.treeWrapper}>
          <Tree
            loadData={onLoadData}
            treeData={treeData}
            titleRender={titleRender}
            onExpand={onExpand}
            expandedKeys={expandedKeys}
            autoExpandParent={autoExpandParent}
            showLine={{ showLeafIcon: false }}
            className={styles.tree}
            selectable={false}
          />
        </div>
      </div>
    </div>
  );
};

FileTreeComponent.displayName = "FileTree";

export const FileTree = React.memo(FileTreeComponent);
