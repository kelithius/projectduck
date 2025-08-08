import React from 'react';
import { Card, Image } from 'antd';
import { FileItem } from '@/types';
import apiService from '@/services/api';

interface MediaViewerProps {
  file: FileItem;
}

export const MediaViewer: React.FC<MediaViewerProps> = ({ file }) => {
  const fileUrl = apiService.getFileRawUrl(file.path);
  
  const isImage = file.extension && 
    ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(file.extension.toLowerCase());
  
  const isVideo = file.extension && 
    ['mp4', 'avi', 'mov', 'webm', 'flv', 'mkv'].includes(file.extension.toLowerCase());

  return (
    <Card style={{ height: '100%', textAlign: 'center' }}>
      {isImage && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          minHeight: '300px'
        }}>
          <Image
            src={fileUrl}
            alt={file.name}
            style={{ 
              maxWidth: '100%',
              maxHeight: '70vh',
              objectFit: 'contain'
            }}
            placeholder={
              <div style={{ 
                width: '100px', 
                height: '100px', 
                backgroundColor: '#f0f0f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                載入中...
              </div>
            }
            fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3Ik1RnG4W+FgYxY4Q0RIgRIgQsSdkQs2OANGhoaMiJkRIiQESFCRoSICBERERERERERERERERERERERERERERERERERERERERH//2Q=="
          />
        </div>
      )}

      {isVideo && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          minHeight: '300px'
        }}>
          <video
            controls
            style={{ 
              maxWidth: '100%',
              maxHeight: '70vh'
            }}
          >
            <source src={fileUrl} type={`video/${file.extension}`} />
            您的瀏覽器不支援影片播放。
          </video>
        </div>
      )}
    </Card>
  );
};