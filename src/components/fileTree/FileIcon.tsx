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

  const getFileIcon = (ext?: string) => {
    if (!ext) return <FileOutlined />;
    
    const lowerExt = ext.toLowerCase();
    
    if (['md', 'markdown'].includes(lowerExt)) {
      return <FileMarkdownOutlined style={{ color: '#52c41a' }} />;
    }
    
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(lowerExt)) {
      return <FileImageOutlined style={{ color: '#722ed1' }} />;
    }
    
    if (['mp4', 'avi', 'mov', 'webm', 'flv', 'mkv'].includes(lowerExt)) {
      return <VideoCameraOutlined style={{ color: '#eb2f96' }} />;
    }
    
    if (['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'go', 'rs', 'php'].includes(lowerExt)) {
      return <CodeOutlined style={{ color: '#fa8c16' }} />;
    }
    
    if (['txt', 'json', 'xml', 'csv', 'yaml', 'yml'].includes(lowerExt)) {
      return <FileTextOutlined style={{ color: '#13c2c2' }} />;
    }
    
    return <FileOutlined />;
  };

  return getFileIcon(extension);
};