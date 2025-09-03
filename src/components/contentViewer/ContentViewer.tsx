'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, Spin, Alert, Typography, Tag, Button, Space } from 'antd';
import { ReloadOutlined, ExclamationCircleOutlined, CloseOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { FileItem, FileWatchInfo, FileWatchStatus } from '@/lib/types';
import apiService from '@/lib/services/api';
import { useProject } from '@/lib/providers/project-provider';
import clientFileWatcher, { FileWatchEventData } from '@/lib/services/clientFileWatcher';
import { MarkdownViewer } from './MarkdownViewer';
import { MediaViewer } from './MediaViewer';
import { CodeViewer } from './CodeViewer';

const { Title, Text } = Typography;

interface ContentViewerProps {
  selectedFile: FileItem | null;
  darkMode?: boolean;
}

export const ContentViewer: React.FC<ContentViewerProps> = ({ selectedFile, darkMode = false }) => {
  const { t } = useTranslation();
  const { getCurrentBasePath } = useProject();
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [watchInfo, setWatchInfo] = useState<FileWatchInfo>({ status: 'idle' });
  
  // 使用 ref 來保存清理函數，避免在依賴陣列中引起重新渲染
  const watchCleanupRef = useRef<(() => void) | null>(null);
  const currentFilePathRef = useRef<string | null>(null);

  const loadFileContent = async (file: FileItem) => {
    if (file.type !== 'file') return;

    try {
      setLoading(true);
      setError(null);
      
      const currentBasePath = getCurrentBasePath();
      if (!currentBasePath) {
        setError(t('fileTree.noProject', '沒有可用的專案'));
        return;
      }
      
      const response = await apiService.getFileContent(file.path, currentBasePath);
      
      if (response.success) {
        setContent(response.data.content);
      } else {
        setError(response.error || t('fileViewer.error'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('fileViewer.error'));
    } finally {
      setLoading(false);
    }
  };

  const getFileType = (file: FileItem): 'markdown' | 'code' | 'json' | 'text' | 'image' | 'video' | 'other' => {
    if (!file.extension) return 'other';
    
    const ext = file.extension.toLowerCase();
    
    if (['md', 'markdown'].includes(ext)) return 'markdown';
    if (['json'].includes(ext)) return 'json';
    if (['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'go', 'rs', 'php', 'rb', 'kt', 'swift', 'dart', 'scala', 'sh', 'bash', 'zsh', 'css', 'scss', 'sass', 'less', 'html', 'htm', 'xml', 'yaml', 'yml'].includes(ext)) return 'code';
    if (['txt', 'csv', 'log', 'md', 'conf', 'ini'].includes(ext)) return 'text';
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(ext)) return 'image';
    if (['mp4', 'avi', 'mov', 'webm', 'flv', 'mkv'].includes(ext)) return 'video';
    
    return 'other';
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '0 B';
    
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  // 檔案監控事件處理
  const handleFileWatchEvent = useCallback((eventData: FileWatchEventData) => {
    console.log('[ContentViewer] File watch event:', eventData);
    
    switch (eventData.event) {
      case 'change':
        setWatchInfo({
          status: 'changed',
          lastModified: Date.now()
        });
        // 自動重新載入檔案內容
        if (selectedFile) {
          loadFileContent(selectedFile);
        }
        break;
      
      case 'unlink':
        setWatchInfo({
          status: 'deleted'
        });
        setError(t('fileViewer.fileDeleted', '檔案已被刪除'));
        break;
      
      case 'move':
        setWatchInfo({
          status: 'moved',
          newPath: eventData.newPath
        });
        setError(t('fileViewer.fileMoved', '檔案已被移動') + (eventData.newPath ? ` → ${eventData.newPath}` : ''));
        break;
      
      case 'add':
        // 檔案重新出現（可能是從回收站恢復或重新建立）
        setWatchInfo({
          status: 'changed',
          lastModified: Date.now()
        });
        break;
      
      case 'error':
        setWatchInfo({
          status: 'error',
          error: eventData.error?.message || 'Unknown watch error'
        });
        break;
    }
  }, [selectedFile, t]);

  // 開始監控檔案
  const startWatchingFile = useCallback((filePath: string, basePath: string) => {
    console.log('[ContentViewer] Starting to watch file:', filePath, 'with base path:', basePath);
    
    // 停止之前的監控
    if (watchCleanupRef.current) {
      watchCleanupRef.current();
      watchCleanupRef.current = null;
    }
    
    // 開始新的監控
    try {
      const cleanup = clientFileWatcher.watchFile(filePath, basePath, handleFileWatchEvent);
      watchCleanupRef.current = cleanup;
      currentFilePathRef.current = filePath;
      
      setWatchInfo({
        status: 'watching',
        lastModified: Date.now()
      });
    } catch (error) {
      console.error('[ContentViewer] Failed to start watching file:', error);
      setWatchInfo({
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to start watching'
      });
    }
  }, [handleFileWatchEvent]);

  // 停止監控檔案
  const stopWatchingFile = useCallback(() => {
    console.log('[ContentViewer] Stopping file watch');
    
    if (watchCleanupRef.current) {
      watchCleanupRef.current();
      watchCleanupRef.current = null;
    }
    
    currentFilePathRef.current = null;
    setWatchInfo({ status: 'idle' });
  }, []);

  // 重新載入檔案內容
  const reloadFileContent = useCallback(async () => {
    if (!selectedFile) return;
    
    console.log('[ContentViewer] Reloading file content');
    await loadFileContent(selectedFile);
    
    // 重新載入後重置監控狀態
    if (watchInfo.status === 'changed') {
      setWatchInfo({
        status: 'watching',
        lastModified: Date.now()
      });
    }
  }, [selectedFile, watchInfo.status]);

  // 忽略檔案變更（關閉變更通知）
  const dismissFileChange = useCallback(() => {
    if (watchInfo.status === 'changed') {
      setWatchInfo({
        status: 'watching',
        lastModified: Date.now()
      });
    }
  }, [watchInfo.status]);

  useEffect(() => {
    if (selectedFile) {
      loadFileContent(selectedFile);
      
      // 只對檔案類型啟動監控，目錄類型不需要監控
      if (selectedFile.type === 'file') {
        const currentBasePath = getCurrentBasePath();
        if (currentBasePath) {
          startWatchingFile(selectedFile.path, currentBasePath);
        }
      }
    } else {
      setContent(null);
      setError(null);
      stopWatchingFile();
    }
  }, [selectedFile, getCurrentBasePath, startWatchingFile, stopWatchingFile]);

  // 清理資源
  useEffect(() => {
    return () => {
      stopWatchingFile();
    };
  }, [stopWatchingFile]);

  if (!selectedFile) {
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center', 
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div>
          <Title level={4} type="secondary">
            {t('fileViewer.selectFile')}
          </Title>
        </div>
      </div>
    );
  }

  const fileType = getFileType(selectedFile);

  // 根據監控狀態顯示不同的狀態指示器
  const renderWatchStatus = () => {
    if (watchInfo.status === 'idle' || watchInfo.status === 'watching') {
      return null;
    }

    const getStatusConfig = (status: FileWatchStatus) => {
      switch (status) {
        case 'changed':
          return {
            type: 'warning' as const,
            icon: <ExclamationCircleOutlined />,
            message: t('fileViewer.fileChanged', '檔案已變更'),
            showReload: true
          };
        case 'deleted':
          return {
            type: 'error' as const,
            icon: <ExclamationCircleOutlined />,
            message: t('fileViewer.fileDeleted', '檔案已被刪除'),
            showReload: false
          };
        case 'moved':
          return {
            type: 'error' as const,
            icon: <ExclamationCircleOutlined />,
            message: t('fileViewer.fileMoved', '檔案已被移動') + (watchInfo.newPath ? ` → ${watchInfo.newPath}` : ''),
            showReload: false
          };
        case 'error':
          return {
            type: 'error' as const,
            icon: <ExclamationCircleOutlined />,
            message: `${t('fileViewer.watchError', '監控錯誤')}: ${watchInfo.error}`,
            showReload: false
          };
        default:
          return null;
      }
    };

    const config = getStatusConfig(watchInfo.status);
    if (!config) return null;

    return (
      <Alert
        type={config.type}
        message={config.message}
        icon={config.icon}
        showIcon
        style={{ margin: '8px 16px' }}
        action={
          config.showReload ? (
            <Space>
              <Button 
                size="small" 
                type="primary"
                icon={<ReloadOutlined />}
                onClick={reloadFileContent}
                loading={loading}
              >
                {t('common.reload', '重新載入')}
              </Button>
              <Button 
                size="small"
                icon={<CloseOutlined />}
                onClick={dismissFileChange}
              >
                {t('common.dismiss', '忽略')}
              </Button>
            </Space>
          ) : undefined
        }
      />
    );
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 檔案狀態通知 */}
      {renderWatchStatus()}
      
      <Card 
        size="small" 
        style={{ 
          margin: '16px', 
          marginBottom: '8px',
          marginTop: watchInfo.status !== 'idle' && watchInfo.status !== 'watching' ? '8px' : '16px',
          borderRadius: '8px',
          backgroundColor: darkMode ? '#1f1f1f' : '#fff',
          borderColor: darkMode ? '#303030' : '#d9d9d9'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title 
              level={5} 
              style={{ 
                margin: 0, 
                color: darkMode ? '#fff' : '#000' 
              }}
            >
              {selectedFile.name}
            </Title>
            <Text 
              type="secondary" 
              style={{ 
                fontSize: '12px',
                color: darkMode ? '#999' : '#666'
              }}
            >
              {selectedFile.path}
            </Text>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {selectedFile.extension && (
              <Tag color="blue">{selectedFile.extension.toUpperCase()}</Tag>
            )}
            <Tag>{formatFileSize(selectedFile.size)}</Tag>
          </div>
        </div>
      </Card>

      <div style={{ 
        flex: 1, 
        margin: '0 16px 16px 16px',
        overflow: 'auto'
      }}>
        {loading && (
          <div style={{ 
            padding: '40px', 
            textAlign: 'center' 
          }}>
            <Spin size="large" />
          </div>
        )}

        {error && (
          <Alert
            message={t('fileViewer.error')}
            description={error}
            type="error"
            showIcon
            style={{ margin: '16px 0' }}
          />
        )}

        {!loading && !error && content !== null && (
          <>
            {fileType === 'markdown' && (
              <MarkdownViewer content={content} darkMode={darkMode} />
            )}

            {fileType === 'code' && (
              <CodeViewer 
                content={content} 
                language={selectedFile.extension || ''} 
                darkMode={darkMode} 
              />
            )}

            {fileType === 'json' && (
              <CodeViewer 
                content={content} 
                language="json" 
                darkMode={darkMode} 
              />
            )}
            
            {fileType === 'text' && (
              <Card 
                style={{
                  backgroundColor: darkMode ? '#1f1f1f' : '#fff',
                  borderColor: darkMode ? '#303030' : '#d9d9d9'
                }}
              >
                <pre style={{ 
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  color: darkMode ? '#e6e6e6' : '#000',
                  backgroundColor: 'transparent'
                }}>
                  {content}
                </pre>
              </Card>
            )}
          </>
        )}

        {!loading && !error && (fileType === 'image' || fileType === 'video') && (
          <MediaViewer file={selectedFile} darkMode={darkMode} />
        )}

        {!loading && !error && fileType === 'other' && (
          <Alert
            message={t('fileViewer.unsupportedFile')}
            description={`${t('fileViewer.fileType')}: .${selectedFile.extension}`}
            type="info"
            showIcon
          />
        )}
      </div>
    </div>
  );
};