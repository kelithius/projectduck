'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Layout, Typography, Spin, Switch, Space, App } from 'antd';
import { BulbOutlined, MoonOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';
import { FileTree } from '@/components/fileTree/FileTree';
import { FileItem } from '@/lib/types';
import apiService from '@/lib/services/api';
import { ThemeProvider, useTheme } from '@/lib/providers/theme-provider';

const ContentViewer = React.lazy(() => 
  import('@/components/contentViewer/ContentViewer').then(module => ({
    default: module.ContentViewer
  }))
);

const { Header, Content } = Layout;
const { Title } = Typography;

const AppLayoutInner: React.FC = () => {
  const { message } = App.useApp();
  const { t } = useTranslation();
  const { isDark, toggleTheme } = useTheme();
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let isCancelled = false;
    
    const checkConnection = async () => {
      try {
        await apiService.healthCheck();
        if (!isCancelled) {
          setLoading(false);
        }
      } catch {
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
  }, [message, t]);

  const handleFileSelect = (file: FileItem) => {
    setSelectedFile(file);
  };

  if (!mounted) {
    return (
      <Layout style={{ height: '100vh' }}>
        <Content style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center' 
        }}>
          <div></div>
        </Content>
      </Layout>
    );
  }

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
    backgroundColor: isDark ? '#001529' : '#fff',
    padding: '0 24px',
    borderBottom: `1px solid ${isDark ? '#303030' : '#f0f0f0'}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  };

  const contentStyle = {
    backgroundColor: isDark ? '#141414' : '#fff',
    overflow: 'hidden' as const
  };

  const sidebarStyle = {
    height: '100%',
    backgroundColor: isDark ? '#1f1f1f' : '#fafafa',
    borderRight: `1px solid ${isDark ? '#303030' : '#f0f0f0'}`,
    overflow: 'auto'
  };

  return (
    <Layout style={{ height: '100vh' }}>
      <Header style={headerStyle}>
        <Space align="center" size="middle" style={{ alignItems: 'center' }}>
          <img 
            src="/AppIcon.png" 
            alt="ProjectDuck Icon" 
            style={{ 
              width: '32px', 
              height: '32px',
              borderRadius: '8px',
              display: 'block'
            }}
          />
          <Title 
            level={3} 
            style={{ 
              margin: 0, 
              lineHeight: '32px',
              color: isDark ? '#fff' : '#1890ff' 
            }}
          >
            {t('title')}
          </Title>
        </Space>
        
        <Space align="center">
          <BulbOutlined 
            style={{ 
              color: isDark ? '#595959' : '#1890ff',
              fontSize: '16px'
            }} 
          />
          <Switch
            checked={isDark}
            onChange={toggleTheme}
            style={{
              backgroundColor: isDark ? '#1890ff' : undefined
            }}
          />
          <MoonOutlined 
            style={{ 
              color: isDark ? '#1890ff' : '#595959',
              fontSize: '16px'
            }} 
          />
        </Space>
      </Header>
      
      <Content style={contentStyle}>
        <Allotment defaultSizes={[300, 700]}>
          <Allotment.Pane minSize={200} maxSize={600}>
            <div style={sidebarStyle}>
              <FileTree onFileSelect={handleFileSelect} darkMode={isDark} />
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
                <ContentViewer selectedFile={selectedFile} darkMode={isDark} />
              </Suspense>
            </div>
          </Allotment.Pane>
        </Allotment>
      </Content>
    </Layout>
  );
};

export const AppLayout: React.FC = () => {
  return (
    <ThemeProvider>
      <AppLayoutInner />
    </ThemeProvider>
  );
};