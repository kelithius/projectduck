'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Tree, Spin, Input, App } from 'antd';
import type { DataNode } from 'antd/es/tree';

interface ExtendedTreeDataNode extends DataNode {
  data?: FileItem;
}

type TreeDataNode = ExtendedTreeDataNode;
import { useTranslation } from 'react-i18next';
import { FileItem } from '@/lib/types';
import apiService from '@/lib/services/api';
import { useProject } from '@/lib/providers/project-provider';
import { FileIcon } from './FileIcon';
import styles from './FileTree.module.css';

const { Search } = Input;

interface FileTreeProps {
  onFileSelect: (file: FileItem | null) => void;
  darkMode?: boolean;
  resetTrigger?: number; // 用於觸發重置的 prop
}

const FileTreeComponent: React.FC<FileTreeProps> = ({ onFileSelect, darkMode = false, resetTrigger }) => {
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
  const [hasError, setHasError] = useState(false);
  const [fallbackUsed, setFallbackUsed] = useState(false);

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
        <span>{item.name}</span>
        {isLoading && (
          <span style={{ 
            marginLeft: '4px', 
            fontSize: '10px', 
            color: '#1890ff' 
          }}>
            載入中...
          </span>
        )}
      </span>
    );
  };

  const resetFileTree = useCallback(() => {
    setTreeData([]);
    setExpandedKeys([]);
    setSearchValue('');
    setAutoExpandParent(true);
    setLoadingNodes(new Set());
    setOperationInProgress(null);
    setHasError(false);
    setFallbackUsed(false);
    // 重置時清除選中的檔案
    onFileSelect(null);
  }, [onFileSelect]);

  const loadRootDirectory = useCallback(async () => {
    try {
      setLoading(true);
      setHasError(false);
      
      // 確保 getCurrentBasePath 返回的是字串而不是 Promise
      let currentBasePath;
      try {
        const basePathResult = getCurrentBasePath();
        // 檢查是否為 Promise，如果是則 await
        currentBasePath = basePathResult instanceof Promise ? await basePathResult : basePathResult;
      } catch (error) {
        console.error('Error getting base path:', error);
        setHasError(true);
        message.error(t('fileTree.noProject', '沒有可用的專案'));
        return;
      }
      
      if (!currentBasePath) {
        setHasError(true);
        message.error(t('fileTree.noProject', '沒有可用的專案'));
        return;
      }
      
      const response = await apiService.getDirectory('', currentBasePath);
      
      if (response.success) {
        const nodes = response.data.items.map(fileItemToTreeNode);
        setTreeData(nodes);
        
        // 處理降級機制的警告
        if (response.fallbackUsed) {
          setFallbackUsed(true);
          message.warning(response.error || t('fileTree.fallbackWarning', '使用備用目錄'));
        }
      } else {
        setHasError(true);
        message.error(response.error || t('fileTree.loadingError'));
      }
    } catch (error) {
      setHasError(true);
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
      let currentBasePath;
      try {
        const basePathResult = getCurrentBasePath();
        currentBasePath = basePathResult instanceof Promise ? await basePathResult : basePathResult;
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
        
        // 如果使用了降級機制，顯示警告
        if (response.fallbackUsed) {
          message.warning(response.error || t('fileTree.fallbackWarning', '使用備用目錄'));
        }
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
        const nodeTitle = typeof node.title === 'string' 
          ? node.title 
          : node.key as string;
        
        if (nodeTitle.toLowerCase().includes(value.toLowerCase())) {
          if (parentKey) {
            expandKeys.push(parentKey);
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

  useEffect(() => {
    let isCancelled = false;
    
    const loadRoot = async () => {
      // 等待專案載入完成
      if (projectLoading) {
        // 專案還在載入中，確保顯示載入狀態
        setLoading(true);
        setHasError(false);
        return;
      }
      
      // 專案載入完成後的處理
      if (!isCancelled && currentProject) {
        // 有可用專案，載入目錄
        await loadRootDirectory();
      } else if (!isCancelled && !currentProject) {
        // 專案載入完成但沒有可用專案時顯示錯誤
        setLoading(false);
        setHasError(true);
        message.error(t('fileTree.noProject', '沒有可用的專案'));
      }
    };
    
    loadRoot();
    
    return () => {
      isCancelled = true;
    };
  }, [projectLoading, currentProject]);

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
        <Search
          placeholder={t('fileTree.searchPlaceholder')}
          onChange={e => onSearch(e.target.value)}
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