import React, { useState, useEffect } from 'react';
import { Tree, Spin, message, Input } from 'antd';
import type { TreeDataNode } from 'antd/es/tree';
import { useTranslation } from 'react-i18next';
import { FileItem } from '@/types';
import apiService from '@/services/api';
import { FileIcon } from './FileIcon';

const { Search } = Input;

interface FileTreeProps {
  onFileSelect: (file: FileItem) => void;
  darkMode?: boolean;
}

export const FileTree: React.FC<FileTreeProps> = ({ onFileSelect, darkMode = false }) => {
  const { t } = useTranslation();
  const [treeData, setTreeData] = useState<TreeDataNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [autoExpandParent, setAutoExpandParent] = useState(true);

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
      
      if (item.type === 'file') {
        // 處理檔案選擇
        try {
          const fileInfo = await apiService.getFileInfo(item.path);
          if (fileInfo.success) {
            const fileItem: FileItem = {
              name: fileInfo.data.name,
              path: fileInfo.data.path,
              type: 'file',
              size: fileInfo.data.size,
              modified: fileInfo.data.modified,
              extension: fileInfo.data.extension,
            };
            onFileSelect(fileItem);
          }
        } catch (error) {
          console.error('Failed to get file info:', error);
        }
      } else {
        // 處理資料夾展開/收折
        if (isExpanded) {
          setExpandedKeys(prev => prev.filter(key => key !== nodeData.key));
        } else {
          setExpandedKeys(prev => [...prev, nodeData.key]);
          // 如果資料夾還沒有載入子項目，觸發載入
          if (!nodeData.children || nodeData.children.length === 0) {
            await onLoadData(nodeData);
          }
        }
        setAutoExpandParent(false);
      }
    };

    return (
      <span 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          cursor: 'pointer',
          width: '100%'
        }}
        onClick={handleTitleClick}
      >
        <FileIcon type={item.type} extension={item.extension} />
        <span>{item.name}</span>
      </span>
    );
  };

  // 載入根目錄
  const loadRootDirectory = async () => {
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
  };

  // 動態載入子目錄
  const onLoadData = async (node: TreeDataNode): Promise<void> => {
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
  };

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
  const onSearch = (value: string) => {
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
  };

  const onExpand = (newExpandedKeys: React.Key[]) => {
    setExpandedKeys(newExpandedKeys as string[]);
    setAutoExpandParent(false);
  };

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
    <div style={{ padding: '16px' }}>
      <Search
        placeholder={t('fileTree.searchPlaceholder')}
        onChange={e => onSearch(e.target.value)}
        style={{ marginBottom: '16px' }}
      />
      
      <Tree
        loadData={onLoadData}
        treeData={treeData}
        titleRender={titleRender}
        onExpand={onExpand}
        expandedKeys={expandedKeys}
        autoExpandParent={autoExpandParent}
        showLine={{ showLeafIcon: false }}
        style={{ backgroundColor: 'transparent' }}
        selectable={false}
      />
    </div>
  );
};