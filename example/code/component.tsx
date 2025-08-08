/**
 * ProjectDuck - React TypeScript 組件示例
 * TypeScript/TSX 語法高亮測試
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Tree, Spin, message, Button, Input, Space } from 'antd';
import { FileOutlined, FolderOutlined, SearchOutlined } from '@ant-design/icons';
import type { TreeDataNode } from 'antd/es/tree';

// TypeScript 介面定義
interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: string;
  extension?: string;
  children?: FileItem[];
}

interface FileTreeProps {
  onFileSelect: (file: FileItem) => void;
  darkMode?: boolean;
  searchable?: boolean;
}

// 枚舉類型
enum FileType {
  FILE = 'file',
  DIRECTORY = 'directory'
}

// 工具類型
type FileSize = number;
type FilePath = string;
type SearchQuery = string;

// 泛型介面
interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

// 自定義 Hook
const useFileTree = (initialPath: string = '') => {
  const [treeData, setTreeData] = useState<TreeDataNode[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);

  const loadDirectory = useCallback(async (path: string): Promise<FileItem[]> => {
    try {
      const response = await fetch(`/api/directory?path=${encodeURIComponent(path)}`);
      const data: ApiResponse<{ items: FileItem[] }> = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to load directory');
      }
      
      return data.data.items;
    } catch (error) {
      console.error('Load directory error:', error);
      throw error;
    }
  }, []);

  const formatFileSize = useMemo(() => (bytes: FileSize): string => {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }, []);

  return {
    treeData,
    setTreeData,
    loading,
    setLoading,
    expandedKeys,
    setExpandedKeys,
    loadDirectory,
    formatFileSize
  };
};

// React 函數組件
const FileTreeComponent: React.FC<FileTreeProps> = ({ 
  onFileSelect, 
  darkMode = false,
  searchable = true 
}) => {
  const {
    treeData,
    setTreeData,
    loading,
    setLoading,
    expandedKeys,
    setExpandedKeys,
    loadDirectory,
    formatFileSize
  } = useFileTree();

  const [searchValue, setSearchValue] = useState<SearchQuery>('');
  const [filteredData, setFilteredData] = useState<TreeDataNode[]>([]);

  // 將檔案項目轉換為樹狀節點
  const fileItemToTreeNode = useCallback((item: FileItem): TreeDataNode => {
    const isFile = item.type === FileType.FILE;
    const icon = isFile ? <FileOutlined /> : <FolderOutlined />;
    
    return {
      title: (
        <Space size="small">
          {icon}
          <span>{item.name}</span>
          {isFile && item.size && (
            <span style={{ 
              color: darkMode ? '#999' : '#666',
              fontSize: '12px' 
            }}>
              ({formatFileSize(item.size)})
            </span>
          )}
        </Space>
      ),
      key: item.path,
      isLeaf: isFile,
      children: item.children?.map(fileItemToTreeNode),
      data: item // 保存原始資料
    };
  }, [darkMode, formatFileSize]);

  // 搜尋過濾邏輯
  const filterTreeData = useCallback((data: TreeDataNode[], query: SearchQuery): TreeDataNode[] => {
    if (!query.trim()) return data;

    const filterNode = (node: TreeDataNode): TreeDataNode | null => {
      const nodeTitle = typeof node.title === 'string' ? node.title : '';
      const matchesSearch = nodeTitle.toLowerCase().includes(query.toLowerCase());
      
      let filteredChildren: TreeDataNode[] = [];
      if (node.children) {
        filteredChildren = node.children
          .map(child => filterNode(child))
          .filter((child): child is TreeDataNode => child !== null);
      }

      if (matchesSearch || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren.length > 0 ? filteredChildren : node.children
        };
      }

      return null;
    };

    return data
      .map(node => filterNode(node))
      .filter((node): node is TreeDataNode => node !== null);
  }, []);

  // 初始化載入
  useEffect(() => {
    let isCancelled = false;

    const initializeTree = async () => {
      try {
        setLoading(true);
        const items = await loadDirectory('');
        
        if (!isCancelled) {
          const nodes = items.map(fileItemToTreeNode);
          setTreeData(nodes);
          setFilteredData(nodes);
        }
      } catch (error) {
        if (!isCancelled) {
          message.error('Failed to load file tree');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    initializeTree();

    return () => {
      isCancelled = true;
    };
  }, [loadDirectory, fileItemToTreeNode]);

  // 搜尋效果
  useEffect(() => {
    const filtered = filterTreeData(treeData, searchValue);
    setFilteredData(filtered);
    
    // 搜尋時自動展開所有匹配的節點
    if (searchValue.trim()) {
      const getAllKeys = (nodes: TreeDataNode[]): React.Key[] => {
        let keys: React.Key[] = [];
        nodes.forEach(node => {
          keys.push(node.key);
          if (node.children) {
            keys = keys.concat(getAllKeys(node.children));
          }
        });
        return keys;
      };
      
      setExpandedKeys(getAllKeys(filtered));
    }
  }, [treeData, searchValue, filterTreeData]);

  // 事件處理器
  const handleSelect = useCallback((selectedKeys: React.Key[], info: any) => {
    if (selectedKeys.length === 0) return;

    const selectedNode = info.node;
    const fileData: FileItem = selectedNode.data;

    if (selectedNode.isLeaf && fileData) {
      onFileSelect(fileData);
    }
  }, [onFileSelect]);

  const handleExpand = useCallback((newExpandedKeys: React.Key[]) => {
    setExpandedKeys(newExpandedKeys);
  }, []);

  const handleSearch = useCallback((value: string) => {
    setSearchValue(value);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchValue('');
    setExpandedKeys([]);
  }, []);

  // 條件渲染
  if (loading) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center' 
      }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px' }}>
          載入檔案樹中...
        </div>
      </div>
    );
  }

  return (
    <Card 
      size="small"
      title="檔案瀏覽器"
      style={{ 
        height: '100%',
        backgroundColor: darkMode ? '#1f1f1f' : '#fff',
        borderColor: darkMode ? '#303030' : '#d9d9d9'
      }}
      bodyStyle={{ 
        padding: '12px',
        height: 'calc(100% - 57px)',
        overflow: 'auto'
      }}
    >
      {searchable && (
        <div style={{ marginBottom: '12px' }}>
          <Input.Search
            placeholder="搜尋檔案..."
            value={searchValue}
            onChange={(e) => handleSearch(e.target.value)}
            onSearch={handleSearch}
            allowClear
            enterButton={<SearchOutlined />}
            style={{ width: '100%' }}
          />
          {searchValue && (
            <Button 
              type="link" 
              size="small" 
              onClick={clearSearch}
              style={{ padding: '4px 0', height: 'auto' }}
            >
              清除搜尋
            </Button>
          )}
        </div>
      )}

      <Tree
        treeData={filteredData}
        onSelect={handleSelect}
        onExpand={handleExpand}
        expandedKeys={expandedKeys}
        showLine={{ showLeafIcon: false }}
        blockNode
        style={{ 
          backgroundColor: 'transparent',
          color: darkMode ? '#fff' : '#000'
        }}
      />
    </Card>
  );
};

// 高階組件 (HOC)
const withErrorBoundary = <P extends object>(Component: React.ComponentType<P>) => {
  return class extends React.Component<P, { hasError: boolean }> {
    constructor(props: P) {
      super(props);
      this.state = { hasError: false };
    }

    static getDerivedStateFromError(): { hasError: boolean } {
      return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      console.error('FileTree Error:', error, errorInfo);
    }

    render() {
      if (this.state.hasError) {
        return (
          <Card>
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <h3>檔案樹載入錯誤</h3>
              <Button onClick={() => this.setState({ hasError: false })}>
                重新載入
              </Button>
            </div>
          </Card>
        );
      }

      return <Component {...this.props} />;
    }
  };
};

// 導出增強版組件
export default withErrorBoundary(FileTreeComponent);
export type { FileTreeProps, FileItem };
export { FileType, useFileTree };