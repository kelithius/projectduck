import React, { useState, useEffect } from 'react';
import { Layout, Typography, Spin, message } from 'antd';
import SplitPane from 'react-split-pane';
import { FileTree } from '@/components/fileTree/FileTree';
import { ContentViewer } from '@/components/contentViewer/ContentViewer';
import { FileItem } from '@/types';
import apiService from '@/services/api';

const { Header, Content } = Layout;
const { Title } = Typography;

export const AppLayout: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(300);

  useEffect(() => {
    // 初始化檢查 API 連接
    const checkConnection = async () => {
      try {
        await apiService.healthCheck();
        setLoading(false);
      } catch (error) {
        message.error('無法連接到後端服務');
        setLoading(false);
      }
    };

    checkConnection();
  }, []);

  const handleFileSelect = (file: FileItem) => {
    setSelectedFile(file);
  };

  const handlePaneResize = (size: number) => {
    setSidebarWidth(size);
    // 儲存到 localStorage
    localStorage.setItem('projectduck-sidebar-width', size.toString());
  };

  // 從 localStorage 載入側邊欄寬度
  useEffect(() => {
    const savedWidth = localStorage.getItem('projectduck-sidebar-width');
    if (savedWidth) {
      setSidebarWidth(parseInt(savedWidth, 10));
    }
  }, []);

  if (loading) {
    return (
      <Layout style={{ height: '100vh' }}>
        <Content style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center' 
        }}>
          <Spin size="large" />
        </Content>
      </Layout>
    );
  }

  return (
    <Layout style={{ height: '100vh' }}>
      <Header 
        style={{ 
          backgroundColor: '#fff', 
          padding: '0 24px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
          ProjectDuck
        </Title>
      </Header>
      
      <Content style={{ overflow: 'hidden' }}>
        <SplitPane
          split="vertical"
          minSize={200}
          maxSize={600}
          defaultSize={sidebarWidth}
          onChange={handlePaneResize}
          style={{ position: 'relative' }}
        >
          <div style={{ 
            height: '100%', 
            backgroundColor: '#fafafa',
            borderRight: '1px solid #f0f0f0'
          }}>
            <FileTree onFileSelect={handleFileSelect} />
          </div>
          
          <div style={{ height: '100%' }}>
            <ContentViewer selectedFile={selectedFile} />
          </div>
        </SplitPane>
      </Content>
    </Layout>
  );
};