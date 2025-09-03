'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Layout, Typography, Spin, Switch, Space, App, Button } from 'antd';
import { BulbOutlined, MoonOutlined, MessageOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';
import { FileTree } from '@/components/fileTree/FileTree';
import { ProjectSidebar } from '@/components/project/ProjectSidebar';
import { FileItem } from '@/lib/types';
import apiService from '@/lib/services/api';
import { ThemeProvider, useTheme } from '@/lib/providers/theme-provider';
import { ProjectProvider } from '@/lib/providers/project-provider';

const ContentViewer = React.lazy(() => 
  import('@/components/contentViewer/ContentViewer').then(module => ({
    default: module.ContentViewer
  }))
);

const ChatPanel = React.lazy(() => 
  import('@/components/chat/ChatPanel').then(module => ({
    default: module.ChatPanel
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
  const [projectSidebarVisible, setProjectSidebarVisible] = useState(false);
  const [chatPanelVisible, setChatPanelVisible] = useState(false);

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

  const handleFileSelect = (file: FileItem | null) => {
    setSelectedFile(file);
    
    // 通知 Claude Code 當前選擇的檔案
    if (file && typeof window !== 'undefined') {
      try {
        // 使用 postMessage 向 Claude Code 通知檔案選擇
        window.parent?.postMessage({
          type: 'fileSelected',
          file: {
            name: file.name,
            path: file.path,
            type: file.type,
            extension: file.extension
          }
        }, '*');
        
        console.log('[AppLayout] Notified Claude Code of file selection:', file.path);
      } catch (error) {
        console.log('[AppLayout] Failed to notify Claude Code:', error);
      }
    }
  };

  const toggleProjectSidebar = () => {
    setProjectSidebarVisible(!projectSidebarVisible);
  };

  const toggleChatPanel = () => {
    setChatPanelVisible(!chatPanelVisible);
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
          <Button
            type="text"
            onClick={toggleProjectSidebar}
            style={{
              color: isDark ? '#b8b8b8' : '#666666',
              borderRadius: '6px',
              padding: '4px 8px',
              height: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            aria-label="Toggle project sidebar"
          >
            <svg 
              width="12" 
              height="14" 
              viewBox="0 0 12 14" 
              fill="none" 
              style={{ display: 'block' }}
            >
              <rect x="0" y="0" width="12" height="2.5" fill="currentColor"/>
              <rect x="0" y="5.5" width="12" height="2.5" fill="currentColor"/>
              <rect x="0" y="11" width="12" height="2.5" fill="currentColor"/>
            </svg>
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
          </Button>
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
          <Button
            type="text"
            icon={<MessageOutlined />}
            onClick={toggleChatPanel}
            style={{
              color: chatPanelVisible 
                ? '#1890ff' 
                : (isDark ? '#b8b8b8' : '#666666')
            }}
            aria-label="Toggle chat panel"
          />
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
        <div style={{ display: 'flex', height: '100%' }}>
          {/* Left Pane: File Tree - Fixed Width */}
          <div style={{ 
            width: '260px', 
            minWidth: '260px', 
            maxWidth: '260px',
            ...sidebarStyle,
            borderRight: `1px solid ${isDark ? '#303030' : '#f0f0f0'}`
          }}>
            <FileTree onFileSelect={handleFileSelect} darkMode={isDark} />
          </div>
          
          {/* Middle and Right Panes: Resizable Content */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {chatPanelVisible ? (
              <Allotment>
                {/* Middle Pane: Content Viewer */}
                <Allotment.Pane minSize={300}>
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

                {/* Right Pane: Chat Panel */}
                <Allotment.Pane size={350} minSize={300} maxSize={500}>
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
                    <ChatPanel darkMode={isDark} />
                  </Suspense>
                </Allotment.Pane>
              </Allotment>
            ) : (
              /* Only Content Viewer when chat panel is closed */
              <div style={{ height: '100%', flex: 1 }}>
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
            )}
          </div>
        </div>
      </Content>
      
      <ProjectSidebar
        visible={projectSidebarVisible}
        onClose={() => setProjectSidebarVisible(false)}
        isDark={isDark}
      />
    </Layout>
  );
};

export const AppLayout: React.FC = () => {
  return (
    <ThemeProvider>
      <ProjectProvider>
        <AppLayoutInner />
      </ProjectProvider>
    </ThemeProvider>
  );
};