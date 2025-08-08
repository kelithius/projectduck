import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Tree, Spin, message, Input } from 'antd';
import type { TreeDataNode } from 'antd/es/tree';
import { useTranslation } from 'react-i18next';
import { FileItem } from '@/types';
import apiService from '@/services/api';
import { FileIcon } from './FileIcon';
import styles from './FileTree.module.css';

const { Search } = Input;

interface FileTreeProps {
  onFileSelect: (file: FileItem) => void;
  darkMode?: boolean;
}

export const FileTree: React.FC<FileTreeProps> = React.memo(({ onFileSelect, darkMode = false }) => {
  const { t } = useTranslation();
  const [treeData, setTreeData] = useState<TreeDataNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [autoExpandParent, setAutoExpandParent] = useState(true);
  
  // 新增：操作去重和載入狀態追踪
  const [loadingNodes, setLoadingNodes] = useState<Set<string>>(new Set());
  const [operationInProgress, setOperationInProgress] = useState<string | null>(null);

  // 將 FileItem 轉換為 TreeDataNode
  const fileItemToTreeNode = (item: FileItem): TreeDataNode => {
    return {
      title: item.name,
      key: item.path,
      isLeaf: item.type === 'file',
      children: item.children?.map(fileItemToTreeNode),
      data: item // 保存原始資料
    };
  };

  // 自定義標題渲染
  const titleRender = (nodeData: any) => {
    const item: FileItem = nodeData.data;
    const isExpanded = expandedKeys.includes(nodeData.key);
    
    const handleTitleClick = async (e: React.MouseEvent) => {
      e.stopPropagation();
      
      // 防止重複點擊
      const operationKey = `${item.type}-${item.path}`;
      if (operationInProgress === operationKey || loadingNodes.has(nodeData.key)) {
        return;
      }
      
      if (item.type === 'file') {
        // 處理檔案選擇 - 直接使用已有的資料，不需要重複請求
        setOperationInProgress(operationKey);
        onFileSelect(item);
        setTimeout(() => setOperationInProgress(null), 100); // 短暫防重複
      } else {
        // 處理資料夾展開/收折
        if (isExpanded) {
          setExpandedKeys(prev => prev.filter(key => key !== nodeData.key));
        } else {
          // 標記節點為載入中
          setLoadingNodes(prev => new Set([...prev, nodeData.key]));
          setOperationInProgress(operationKey);
          
          setExpandedKeys(prev => [...prev, nodeData.key]);
          // 如果資料夾還沒有載入子項目，觸發載入
          if (!nodeData.children || nodeData.children.length === 0) {
            try {
              await onLoadData(nodeData);
            } finally {
              // 載入完成後清除狀態
              setLoadingNodes(prev => {
                const newSet = new Set(prev);
                newSet.delete(nodeData.key);
                return newSet;
              });
              setOperationInProgress(null);
            }
          } else {
            // 如果不需要載入數據，也要清除狀態
            setLoadingNodes(prev => {
              const newSet = new Set(prev);
              newSet.delete(nodeData.key);
              return newSet;
            });
            setOperationInProgress(null);
          }
        }
        setAutoExpandParent(false);
      }
    };

    const isLoading = loadingNodes.has(nodeData.key);
    
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

  // 載入根目錄
  const loadRootDirectory = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.getDirectory('');
      
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
  }, [t]);

  // 動態載入子目錄
  const onLoadData = useCallback(async (node: TreeDataNode): Promise<void> => {
    const { key } = node;
    
    try {
      const response = await apiService.getDirectory(key as string);
      
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
  }, [t]);

  // 更新樹狀數據
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


  // 搜尋功能
  const onSearch = useCallback((value: string) => {
    setSearchValue(value);
    if (!value) {
      setExpandedKeys([]);
      setAutoExpandParent(false);
      return;
    }

    // 找到匹配的節點並展開其父節點
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
      if (!isCancelled) {
        await loadRootDirectory();
      }
    };
    
    loadRoot();
    
    return () => {
      isCancelled = true;
    };
  }, []);

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
});