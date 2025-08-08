import React, { useState, useEffect } from 'react';
import { Card, Spin, Alert, Typography, Divider, Tag } from 'antd';
import { useTranslation } from 'react-i18next';
import { FileItem } from '@/types';
import apiService from '@/services/api';
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
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 載入檔案內容
  const loadFileContent = async (file: FileItem) => {
    if (file.type !== 'file') return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.getFileContent(file.path);
      
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

  // 判斷檔案類型
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

  // 格式化檔案大小
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '0 B';
    
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  // 當選中檔案改變時載入內容
  useEffect(() => {
    if (selectedFile) {
      loadFileContent(selectedFile);
    } else {
      setContent(null);
      setError(null);
    }
  }, [selectedFile]);

  // 如果沒有選中檔案
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

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 檔案資訊標題 */}
      <Card 
        size="small" 
        style={{ 
          margin: '16px', 
          marginBottom: '8px',
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

      {/* 內容區域 */}
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