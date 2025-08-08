import React from 'react';
import { 
  FolderOutlined, 
  FileTextOutlined, 
  FileImageOutlined,
  VideoCameraOutlined,
  FileOutlined,
  CodeOutlined,
  FileMarkdownOutlined
} from '@ant-design/icons';

interface FileIconProps {
  type: 'file' | 'directory';
  extension?: string;
}

export const FileIcon: React.FC<FileIconProps> = ({ type, extension }) => {
  if (type === 'directory') {
    return <FolderOutlined style={{ color: '#1890ff' }} />;
  }

  // 根據檔案副檔名決定圖示
  const getFileIcon = (ext?: string) => {
    if (!ext) return <FileOutlined />;
    
    const lowerExt = ext.toLowerCase();
    
    // Markdown 檔案
    if (['md', 'markdown'].includes(lowerExt)) {
      return <FileMarkdownOutlined style={{ color: '#52c41a' }} />;
    }
    
    // 圖片檔案
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(lowerExt)) {
      return <FileImageOutlined style={{ color: '#722ed1' }} />;
    }
    
    // 影片檔案
    if (['mp4', 'avi', 'mov', 'webm', 'flv', 'mkv'].includes(lowerExt)) {
      return <VideoCameraOutlined style={{ color: '#eb2f96' }} />;
    }
    
    // 程式碼檔案
    if (['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'go', 'rs', 'php'].includes(lowerExt)) {
      return <CodeOutlined style={{ color: '#fa8c16' }} />;
    }
    
    // 文字檔案
    if (['txt', 'json', 'xml', 'csv', 'yaml', 'yml'].includes(lowerExt)) {
      return <FileTextOutlined style={{ color: '#13c2c2' }} />;
    }
    
    // 預設檔案圖示
    return <FileOutlined />;
  };

  return getFileIcon(extension);
};