import React, { useState, useEffect, Suspense } from 'react';
import { Layout, Typography, Spin, Switch, Space, App } from 'antd';
import { BulbOutlined, MoonOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';
import { FileTree } from '@/components/fileTree/FileTree';
import { FileItem } from '@/types';
import apiService from '@/services/api';

// 延遲載入 ContentViewer
const ContentViewer = React.lazy(() => 
  import('@/components/contentViewer/ContentViewer').then(module => ({
    default: module.ContentViewer
  }))
);

const { Header, Content } = Layout;
const { Title } = Typography;

export const AppLayout: React.FC = () => {
  const { message } = App.useApp();
  const { t } = useTranslation();
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  // 從 localStorage 載入主題設定
  useEffect(() => {
    const savedTheme = localStorage.getItem('projectduck-theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
    }
  }, []);

  // 儲存主題設定到 localStorage
  const handleThemeChange = (isDark: boolean) => {
    setDarkMode(isDark);
    localStorage.setItem('projectduck-theme', isDark ? 'dark' : 'light');
    
    // 觸發自訂事件來通知其他組件
    window.dispatchEvent(new CustomEvent('themeChange', { 
      detail: { isDark } 
    }));
  };

  useEffect(() => {
    let isCancelled = false;
    
    // 初始化檢查 API 連接
    const checkConnection = async () => {
      try {
        await apiService.healthCheck();
        if (!isCancelled) {
          setLoading(false);
        }
      } catch (error) {
        if (!isCancelled) {
          message.error(t('fileTree.loadingError'));
          setLoading(false);
        }
      }
    };

    checkConnection();
    
    return () => {
      isCancelled = true;
    };
  }, [message]);

  const handleFileSelect = (file: FileItem) => {
    setSelectedFile(file);
  };

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

  const headerStyle = {
    backgroundColor: darkMode ? '#001529' : '#fff',
    padding: '0 24px',
    borderBottom: `1px solid ${darkMode ? '#303030' : '#f0f0f0'}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  };

  const contentStyle = {
    backgroundColor: darkMode ? '#141414' : '#fff',
    overflow: 'hidden' as const
  };

  const sidebarStyle = {
    height: '100%',
    backgroundColor: darkMode ? '#1f1f1f' : '#fafafa',
    borderRight: `1px solid ${darkMode ? '#303030' : '#f0f0f0'}`
  };

  return (
    <Layout style={{ height: '100vh' }}>
      <Header style={headerStyle}>
        <Space align="center" size="middle">
          <img 
            src="/AppIcon.png" 
            alt="ProjectDuck Icon" 
            style={{ 
              width: '32px', 
              height: '32px',
              borderRadius: '8px'
            }}
          />
          <Title 
            level={3} 
            style={{ 
              margin: 0, 
              color: darkMode ? '#fff' : '#1890ff' 
            }}
          >
            {t('title')}
          </Title>
        </Space>
        
        <Space align="center">
          <BulbOutlined 
            style={{ 
              color: darkMode ? '#595959' : '#1890ff',
              fontSize: '16px'
            }} 
          />
          <Switch
            checked={darkMode}
            onChange={handleThemeChange}
            style={{
              backgroundColor: darkMode ? '#1890ff' : undefined
            }}
          />
          <MoonOutlined 
            style={{ 
              color: darkMode ? '#1890ff' : '#595959',
              fontSize: '16px'
            }} 
          />
        </Space>
      </Header>
      
      <Content style={contentStyle}>
        <Allotment defaultSizes={[300, 700]}>
          <Allotment.Pane minSize={200} maxSize={600}>
            <div style={sidebarStyle}>
              <FileTree onFileSelect={handleFileSelect} darkMode={darkMode} />
            </div>
          </Allotment.Pane>
          
          <Allotment.Pane>
            <div style={{ height: '100%' }}>
              <Suspense fallback={
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  height: '100%' 
                }}>
                  <Spin size="large" />
                </div>
              }>
                <ContentViewer selectedFile={selectedFile} darkMode={darkMode} />
              </Suspense>
            </div>
          </Allotment.Pane>
        </Allotment>
      </Content>
    </Layout>
  );
};