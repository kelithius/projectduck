'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Tree, Spin, Input, App } from 'antd';
import type { InputRef } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';

interface ExtendedTreeDataNode extends DataNode {
  data?: FileItem;
}

type TreeDataNode = ExtendedTreeDataNode;
import { useTranslation } from 'react-i18next';
import { FileItem, DirectoryWatchEvent, TreeNodeOperationData } from '@/lib/types';
import apiService from '@/lib/services/api';
import { cacheService } from '@/lib/services/cache';
import { useProject } from '@/lib/providers/project-provider';
import { FileIcon } from './FileIcon';
import directoryWatcher from '@/lib/services/directoryWatcher';
import styles from './FileTree.module.css';


interface FileTreeProps {
  onFileSelect: (file: FileItem | null) => void;
  selectedFile?: FileItem | null; // 當前選中的檔案
  darkMode?: boolean;
  resetTrigger?: number; // 用於觸發重置的 prop
}

const FileTreeComponent: React.FC<FileTreeProps> = ({ onFileSelect, selectedFile, darkMode = false, resetTrigger }) => {
  const { message } = App.useApp();
  const { t } = useTranslation();
  const { getCurrentBasePath, currentProject, isLoading: projectLoading } = useProject();
  const [treeData, setTreeData] = useState<TreeDataNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [autoExpandParent, setAutoExpandParent] = useState(true);
  const [loadingNodes, setLoadingNodes] = useState<Set<string>>(new Set());
  const [operationInProgress, setOperationInProgress] = useState<string | null>(null);
  const [isWatchingDirectory, setIsWatchingDirectory] = useState(false);
  const searchInputRef = useRef<InputRef>(null);
  const watchCleanupRef = useRef<(() => void) | null>(null);

  const fileItemToTreeNode = (item: FileItem): TreeDataNode => {
    return {
      title: item.name,
      key: item.path,
      isLeaf: item.type === 'file',
      children: item.children?.map(fileItemToTreeNode),
      data: item
    };
  };

  const titleRender = (nodeData: TreeDataNode & { data?: FileItem }) => {
    const item = nodeData.data;
    if (!item) return null;
    const isExpanded = expandedKeys.includes(nodeData.key?.toString() || '');
    const isSelected = selectedFile && selectedFile.path === item.path;
    
    const handleTitleClick = async (e: React.MouseEvent) => {
      e.stopPropagation();
      
      const operationKey = `${item.type}-${item.path}`;
      if (operationInProgress === operationKey || loadingNodes.has(nodeData.key?.toString() || '')) {
        return;
      }
      
      if (item.type === 'file') {
        setOperationInProgress(operationKey);
        onFileSelect(item);
        setTimeout(() => setOperationInProgress(null), 100);
      } else {
        if (isExpanded) {
          setExpandedKeys(prev => prev.filter(key => key !== nodeData.key?.toString()));
        } else {
          setLoadingNodes(prev => new Set([...prev, nodeData.key?.toString() || '']));
          setOperationInProgress(operationKey);
          
          setExpandedKeys(prev => [...prev, nodeData.key?.toString() || '']);
          if (!nodeData.children || nodeData.children.length === 0) {
            try {
              await onLoadData(nodeData);
            } finally {
              setLoadingNodes(prev => {
                const newSet = new Set(prev);
                newSet.delete(nodeData.key?.toString() || '');
                return newSet;
              });
              setOperationInProgress(null);
            }
          } else {
            setLoadingNodes(prev => {
              const newSet = new Set(prev);
              newSet.delete(nodeData.key?.toString() || '');
              return newSet;
            });
            setOperationInProgress(null);
          }
        }
        setAutoExpandParent(false);
      }
    };

    const isLoading = loadingNodes.has(nodeData.key?.toString() || '');
    
    // 高亮搜尋文字
    const renderHighlightText = (text: string, searchTerm: string) => {
      if (!searchTerm) return text;
      
      const index = text.toLowerCase().indexOf(searchTerm.toLowerCase());
      if (index === -1) return text;
      
      return (
        <>
          {text.substring(0, index)}
          <span style={{ 
            backgroundColor: darkMode ? '#faad14' : '#ffeb3b', 
            color: darkMode ? '#000' : '#000',
            fontWeight: 'bold',
            padding: '0 2px',
            borderRadius: '2px'
          }}>
            {text.substring(index, index + searchTerm.length)}
          </span>
          {text.substring(index + searchTerm.length)}
        </>
      );
    };
    
    return (
      <span 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          cursor: isLoading ? 'wait' : 'pointer',
          width: '100%',
          opacity: isLoading ? 0.7 : 1
        }}
        onClick={handleTitleClick}
      >
        <FileIcon type={item.type} extension={item.extension} />
        <span 
          style={{
            fontWeight: isSelected ? 'bold' : 'normal',
            color: isSelected ? (darkMode ? '#1890ff' : '#1890ff') : 'inherit'
          }}
        >
          {renderHighlightText(item.name, searchValue)}
        </span>
        {isLoading && (
          <span style={{ 
            marginLeft: '4px', 
            fontSize: '10px', 
            color: '#1890ff' 
          }}>
{t('status.loading')}
          </span>
        )}
      </span>
    );
  };

  // 停止監控目錄
  const stopDirectoryWatch = useCallback(() => {
    if (watchCleanupRef.current) {
      console.log('[FileTree] Stopping directory watch');
      watchCleanupRef.current();
      watchCleanupRef.current = null;
    }
    setIsWatchingDirectory(false);
  }, []);

  const resetFileTree = useCallback(() => {
    // 停止目錄監控
    stopDirectoryWatch();
    
    setTreeData([]);
    setExpandedKeys([]);
    setSearchValue('');
    setAutoExpandParent(true);
    setLoadingNodes(new Set());
    setOperationInProgress(null);
    
    // 重置時清除選中的檔案
    onFileSelect(null);
  }, [onFileSelect, stopDirectoryWatch]);

  const loadRootDirectory = useCallback(async () => {
    try {
      setLoading(true);
      
      // 確保 getCurrentBasePath 返回的是字串而不是 Promise
      let currentBasePath: string;
      try {
        currentBasePath = getCurrentBasePath();
      } catch (error) {
        console.error('Error getting base path:', error);
        message.error(t('fileTree.noProject', '沒有可用的專案'));
        return;
      }
      
      if (!currentBasePath) {
        message.error(t('fileTree.noProject', '沒有可用的專案'));
        return;
      }
      
      const response = await apiService.getDirectory('', currentBasePath);
      
      if (response.success) {
        const nodes = response.data.items.map(fileItemToTreeNode);
        setTreeData(nodes);
        
      } else {
        message.error(response.error || t('fileTree.loadingError'));
      }
    } catch (error) {
      message.error(t('fileTree.loadingError'));
      console.error('Failed to load directory:', error);
    } finally {
      setLoading(false);
    }
  }, [getCurrentBasePath, message, t]);

  const onLoadData = useCallback(async (node: TreeDataNode): Promise<void> => {
    const { key } = node;
    
    try {
      // 確保 getCurrentBasePath 返回的是字串而不是 Promise
      let currentBasePath: string;
      try {
        currentBasePath = getCurrentBasePath();
      } catch (error) {
        console.error('Error getting base path:', error);
        message.error(t('fileTree.noProject', '沒有可用的專案'));
        return;
      }
      
      if (!currentBasePath) {
        message.error(t('fileTree.noProject', '沒有可用的專案'));
        return;
      }
      
      const response = await apiService.getDirectory(key as string, currentBasePath);
      
      if (response.success) {
        const childNodes = response.data.items.map(fileItemToTreeNode);
        
        setTreeData(prevData => 
          updateTreeData(prevData, key as string, childNodes)
        );
        
      } else {
        message.error(response.error || t('fileTree.loadingError'));
      }
    } catch (error) {
      message.error(t('fileTree.loadingError'));
      console.error('Failed to load subdirectory:', error);
    }
  }, [getCurrentBasePath, message, t]);

  const updateTreeData = (
    list: TreeDataNode[], 
    key: string, 
    children: TreeDataNode[]
  ): TreeDataNode[] => {
    return list.map(node => {
      if (node.key === key) {
        return { ...node, children };
      }
      if (node.children) {
        return { ...node, children: updateTreeData(node.children, key, children) };
      }
      return node;
    });
  };

  const onSearch = useCallback((value: string) => {
    setSearchValue(value);
    if (!value) {
      setExpandedKeys([]);
      setAutoExpandParent(false);
      return;
    }

    const expandKeys: string[] = [];
    const searchInTree = (nodes: TreeDataNode[], parentKey?: string) => {
      nodes.forEach(node => {
        const nodeTitle = node.data?.name || (typeof node.title === 'string' ? node.title : node.key as string);
        
        if (nodeTitle && nodeTitle.toLowerCase().includes(value.toLowerCase())) {
          // 找到匹配項目，展開其所有父級路徑
          if (parentKey && !expandKeys.includes(parentKey)) {
            expandKeys.push(parentKey);
          }
          // 如果匹配的是資料夾，也要展開該資料夾本身
          if (node.data?.type === 'directory' && !expandKeys.includes(node.key as string)) {
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
  }, [treeData]);

  const onExpand = useCallback((newExpandedKeys: React.Key[]) => {
    setExpandedKeys(newExpandedKeys as string[]);
    setAutoExpandParent(false);
  }, []);

  // 智慧更新樹節點 - 保持展開狀態
  const smartUpdateTreeNode = useCallback((operation: TreeNodeOperationData) => {
    const { operation: op, parentKey, nodeKey, nodeData, newParentKey, newNodeKey } = operation;
    
    console.log(`[FileTree] Smart update: ${op} for ${nodeKey}`, operation);
    
    setTreeData(prevData => {
      switch (op) {
        case 'add':
          if (!nodeData) return prevData;
          return addNodeToTree(prevData, parentKey, nodeData);
          
        case 'remove':
          return removeNodeFromTree(prevData, nodeKey);
          
        case 'update':
          if (!nodeData) return prevData;
          return updateNodeInTree(prevData, nodeKey, nodeData);
          
        case 'move':
          if (!newParentKey) return prevData;
          return moveNodeInTree(prevData, nodeKey, parentKey, newParentKey, newNodeKey);
          
        default:
          return prevData;
      }
    });
  }, []);

  // 添加節點到樹中
  const addNodeToTree = (nodes: TreeDataNode[], parentKey: string, nodeData: FileItem): TreeDataNode[] => {
    if (parentKey === '') {
      // 添加到根級
      const newNode = fileItemToTreeNode(nodeData);
      return [...nodes, newNode].sort((a, b) => {
        // 資料夾在前，檔案在後，同類型按字母順序
        const aIsDir = a.data?.type === 'directory';
        const bIsDir = b.data?.type === 'directory';
        if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
        return (a.data?.name || '').localeCompare(b.data?.name || '');
      });
    }
    
    return nodes.map(node => {
      if (node.key === parentKey) {
        const newNode = fileItemToTreeNode(nodeData);
        const updatedChildren = [...(node.children || []), newNode].sort((a, b) => {
          const aIsDir = a.data?.type === 'directory';
          const bIsDir = b.data?.type === 'directory';
          if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
          return (a.data?.name || '').localeCompare(b.data?.name || '');
        });
        return { ...node, children: updatedChildren };
      }
      
      if (node.children) {
        return { ...node, children: addNodeToTree(node.children, parentKey, nodeData) };
      }
      
      return node;
    });
  };

  // 從樹中移除節點
  const removeNodeFromTree = (nodes: TreeDataNode[], nodeKey: string): TreeDataNode[] => {
    return nodes.filter(node => {
      if (node.key === nodeKey) {
        return false; // 移除此節點
      }
      
      if (node.children) {
        node.children = removeNodeFromTree(node.children, nodeKey);
      }
      
      return true;
    });
  };

  // 更新樹中的節點
  const updateNodeInTree = (nodes: TreeDataNode[], nodeKey: string, nodeData: FileItem): TreeDataNode[] => {
    return nodes.map(node => {
      if (node.key === nodeKey) {
        // 更新節點數據，但保持其他屬性
        return {
          ...node,
          title: nodeData.name,
          data: nodeData
        };
      }
      
      if (node.children) {
        return { ...node, children: updateNodeInTree(node.children, nodeKey, nodeData) };
      }
      
      return node;
    });
  };

  // 移動樹中的節點
  const moveNodeInTree = (
    nodes: TreeDataNode[], 
    nodeKey: string, 
    oldParentKey: string, 
    newParentKey: string, 
    newNodeKey?: string
  ): TreeDataNode[] => {
    // 先找到要移動的節點
    let nodeToMove: TreeDataNode | null = null;
    
    const findAndRemoveNode = (currentNodes: TreeDataNode[]): TreeDataNode[] => {
      return currentNodes.filter(node => {
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
    
    // 如果找到了節點，將其添加到新位置
    if (nodeToMove && nodeToMove.data) {
      // 更新節點的 key（如果有重新命名）
      if (newNodeKey) {
        nodeToMove = {
          ...nodeToMove,
          key: newNodeKey,
          title: nodeToMove.data.name
        };
      }
      
      updatedNodes = addNodeToTree(updatedNodes, newParentKey, nodeToMove.data);
    }
    
    return updatedNodes;
  };

  // 自動展開到選中檔案的路徑
  const expandToSelectedFile = useCallback((selectedFilePath: string) => {
    if (!selectedFilePath) return;
    
    // 獲取檔案路徑的所有父目錄
    const pathParts = selectedFilePath.split('/');
    const expandKeys: string[] = [];
    
    let currentPath = '';
    for (let i = 0; i < pathParts.length - 1; i++) {
      if (currentPath) {
        currentPath += '/' + pathParts[i];
      } else {
        currentPath = pathParts[i];
      }
      expandKeys.push(currentPath);
    }
    
    if (expandKeys.length > 0) {
      console.log('[FileTree] Expanding to selected file:', selectedFilePath, 'expand keys:', expandKeys);
      setExpandedKeys(prevKeys => {
        const newKeys = [...new Set([...prevKeys, ...expandKeys])];
        return newKeys;
      });
    }
  }, []);

  // 處理目錄變動事件
  const handleDirectoryWatchEvent = useCallback((event: DirectoryWatchEvent) => {
    console.log(`[FileTree] handleDirectoryWatchEvent called with:`, event);
    
    const { type, relativePath, stats } = event;
    
    if (!relativePath || relativePath === '') {
      console.log(`[FileTree] Ignoring event with empty relativePath:`, event);
      return;
    }
    
    console.log(`[FileTree] Processing directory event: ${type} for ${relativePath}`, event);
    
    // 清除相關的 API 快取
    if (relativePath) {
      const basePath = getCurrentBasePath();
      const parentPath = relativePath.includes('/') ? relativePath.substring(0, relativePath.lastIndexOf('/')) : '';
      
      // 清除當前目錄的快取
      const cacheKey = basePath ? `directory:${basePath}:${relativePath}` : `directory:${relativePath}`;
      cacheService.delete(cacheKey);
      
      // 清除父目錄的快取（如果有的話）
      if (parentPath) {
        const parentCacheKey = basePath ? `directory:${basePath}:${parentPath}` : `directory:${parentPath}`;
        cacheService.delete(parentCacheKey);
      } else {
        // 如果沒有父目錄，清除根目錄快取
        const rootCacheKey = basePath ? `directory:${basePath}:` : `directory:`;
        cacheService.delete(rootCacheKey);
      }
    }
    
    const parentPath = relativePath.includes('/') ? relativePath.substring(0, relativePath.lastIndexOf('/')) : '';
    const fileName = relativePath.includes('/') ? relativePath.substring(relativePath.lastIndexOf('/') + 1) : relativePath;
    
    try {
      const basePath = getCurrentBasePath();
      const fullPath = basePath ? `${basePath}/${relativePath}` : relativePath;
      
      switch (type) {
        case 'add':
        case 'addDir':
          if (stats) {
            const newFileItem: FileItem = {
              name: fileName,
              path: relativePath,
              type: stats.isDirectory ? 'directory' : 'file',
              size: stats.size,
              modified: stats.modified || new Date().toISOString(),
              extension: stats.isFile && fileName.includes('.') ? fileName.split('.').pop() : undefined,
              children: stats.isDirectory ? [] : undefined
            };
            
            smartUpdateTreeNode({
              operation: 'add',
              parentKey: parentPath,
              nodeKey: relativePath,
              nodeData: newFileItem
            });
            
            // 如果當前有選中檔案，確保展開狀態正確
            if (selectedFile) {
              setTimeout(() => expandToSelectedFile(selectedFile.path), 100);
            }
          }
          break;
          
        case 'unlink':
        case 'unlinkDir':
          // 如果被刪除的檔案是當前選中的檔案，清除選擇
          if (selectedFile && selectedFile.path === relativePath) {
            onFileSelect(null);
          }
          
          smartUpdateTreeNode({
            operation: 'remove',
            parentKey: parentPath,
            nodeKey: relativePath
          });
          break;
          
        case 'change':
          // 檔案內容變更，更新修改時間
          if (stats) {
            const updatedFileItem: FileItem = {
              name: fileName,
              path: relativePath,
              type: 'file',
              size: stats.size,
              modified: stats.modified || new Date().toISOString(),
              extension: fileName.includes('.') ? fileName.split('.').pop() : undefined
            };
            
            smartUpdateTreeNode({
              operation: 'update',
              parentKey: parentPath,
              nodeKey: relativePath,
              nodeData: updatedFileItem
            });
          }
          break;
          
        case 'error':
          console.error(`[FileTree] Directory watch error:`, event.error);
          message.error(`檔案監控錯誤: ${event.error}`);
          break;
      }
    } catch (error) {
      console.error(`[FileTree] Error handling directory event:`, error);
    }
  }, [getCurrentBasePath, message, smartUpdateTreeNode]);

  // 開始監控目錄
  const startDirectoryWatch = useCallback(() => {
    if (isWatchingDirectory || !currentProject) return;
    
    try {
      const basePath = getCurrentBasePath();
      if (!basePath) {
        console.warn('[FileTree] Cannot start directory watch: no basePath');
        return;
      }
      
      console.log('[FileTree] Starting directory watch for:', basePath);
      
      const cleanup = directoryWatcher.watchDirectory({
        basePath,
        targetPath: '', // 監控根目錄
        recursive: true,
        callback: handleDirectoryWatchEvent
      });
      
      watchCleanupRef.current = cleanup;
      setIsWatchingDirectory(true);
      
    } catch (error) {
      console.error('[FileTree] Failed to start directory watch:', error);
    }
  }, [isWatchingDirectory, currentProject, getCurrentBasePath, handleDirectoryWatchEvent]);

  useEffect(() => {
    let isCancelled = false;
    
    const loadRoot = async () => {
      // 等待專案載入完成
      if (projectLoading) {
        // 專案還在載入中，確保顯示載入狀態
        setLoading(true);
        return;
      }
      
      // 專案載入完成後的處理
      if (!isCancelled && currentProject) {
        // 有可用專案，載入目錄
        await loadRootDirectory();
        
        // 載入完成後開始監控目錄
        if (!isCancelled) {
          startDirectoryWatch();
        }
      } else if (!isCancelled && !currentProject) {
        // 專案載入完成但沒有可用專案時顯示錯誤
        setLoading(false);
        message.error(t('fileTree.noProject', '沒有可用的專案'));
        
        // 停止任何現有的目錄監控
        stopDirectoryWatch();
      }
    };
    
    loadRoot();
    
    return () => {
      isCancelled = true;
    };
  }, [projectLoading, currentProject, startDirectoryWatch, stopDirectoryWatch]);

  // 監聽 resetTrigger 變化
  useEffect(() => {
    if (resetTrigger !== undefined) {
      resetFileTree();
      // 不使用 setTimeout，讓 React 的狀態更新週期處理
      // loadRootDirectory 會在主要的 useEffect 中被觸發
    }
  }, [resetTrigger, resetFileTree]);

  // 監聽專案變更事件
  useEffect(() => {
    const handleProjectChange = () => {
      resetFileTree();
      // 不使用 setTimeout，讓 React 的狀態更新週期處理
      // loadRootDirectory 會在主要的 useEffect 中被觸發
    };

    window.addEventListener('projectChange', handleProjectChange);
    
    return () => {
      window.removeEventListener('projectChange', handleProjectChange);
    };
  }, [resetFileTree]);

  // 組件卸載時清理監控器
  useEffect(() => {
    return () => {
      stopDirectoryWatch();
    };
  }, [stopDirectoryWatch]);

  if (loading) {
    return (
      <div style={{ 
        padding: '20px', 
        display: 'flex', 
        justifyContent: 'center' 
      }}>
        <Spin />
      </div>
    );
  }

  return (
    <div className={styles.fileTreeContainer}>
      <div className={styles.searchWrapper}>
        <Input
          ref={searchInputRef}
          placeholder={t('fileTree.searchPlaceholder')}
          allowClear={true}
          value={searchValue}
          onChange={e => onSearch(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Escape') {
              e.preventDefault();
              onSearch('');
            }
          }}
          prefix={<SearchOutlined />}
        />
      </div>
      
      <div className={`${styles.cardContainer} ${darkMode ? styles.dark : ''}`}>
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

FileTreeComponent.displayName = 'FileTree';

export const FileTree = React.memo(FileTreeComponent);