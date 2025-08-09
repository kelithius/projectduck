'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Tree, Spin, message, Input } from 'antd';
import type { DataNode } from 'antd/es/tree';

interface ExtendedTreeDataNode extends DataNode {
  data?: FileItem;
}

type TreeDataNode = ExtendedTreeDataNode;
import { useTranslation } from 'react-i18next';
import { FileItem } from '@/lib/types';
import apiService from '@/lib/services/api';
import { FileIcon } from './FileIcon';
import styles from './FileTree.module.css';

const { Search } = Input;

interface FileTreeProps {
  onFileSelect: (file: FileItem) => void;
  darkMode?: boolean;
}

const FileTreeComponent: React.FC<FileTreeProps> = ({ onFileSelect, darkMode = false }) => {
  const { t } = useTranslation();
  const [treeData, setTreeData] = useState<TreeDataNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [autoExpandParent, setAutoExpandParent] = useState(true);
  const [loadingNodes, setLoadingNodes] = useState<Set<string>>(new Set());
  const [operationInProgress, setOperationInProgress] = useState<string | null>(null);

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
};

FileTreeComponent.displayName = 'FileTree';

export const FileTree = React.memo(FileTreeComponent);