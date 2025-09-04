'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Layout, Typography, Spin, Space, App, Button } from 'antd';
import { BulbOutlined, MoonOutlined, MessageOutlined, SunOutlined } from '@ant-design/icons';
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
  const [chatPanelWidth, setChatPanelWidth] = useState(350); // 預設寬度
  const [fileTreeWidth, setFileTreeWidth] = useState(260); // FileTree 預設寬度
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingFileTree, setIsDraggingFileTree] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 為每個新視窗/標籤頁產生唯一 ID
      let windowId = sessionStorage.getItem('windowId');
      if (!windowId) {
        windowId = `window_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('windowId', windowId);
        sessionStorage.setItem('isNewWindow', 'true');
        console.log('[AppLayout] New window detected, assigned ID:', windowId);
      }
      
      // 檢查是否為頁面重新整理
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation && navigation.type === 'reload') {
        sessionStorage.setItem('pageRefreshed', 'true');
        console.log('[AppLayout] Page was refreshed, marking for session clear');
      } else {
        console.log('[AppLayout] Normal navigation, windowId:', windowId);
      }
    }
    
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
    
    // 通知 Claude Code 和內部組件當前選擇的檔案
    if (file && typeof window !== 'undefined') {
      try {
        const fileSelectionMessage = {
          type: 'fileSelected',
          file: {
            name: file.name,
            path: file.path,
            type: file.type,
            extension: file.extension
          }
        };

        // 通知 Claude Code (如果在 iframe 中)
        window.parent?.postMessage(fileSelectionMessage, '*');
        
        // 通知同一視窗中的組件 (ChatPanel)
        window.postMessage(fileSelectionMessage, '*');
        
        console.log('[AppLayout] Notified file selection:', file.path);
      } catch (error) {
        console.log('[AppLayout] Failed to notify file selection:', error);
      }
    }
  };

  const toggleProjectSidebar = () => {
    setProjectSidebarVisible(!projectSidebarVisible);
  };

  const toggleChatPanel = () => {
    setChatPanelVisible(!chatPanelVisible);
  };

  // ChatPanel 拖拽處理邏輯
  const handleChatPanelMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    
    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      const minWidth = 300;
      const maxWidth = Math.min(800, window.innerWidth - 400); // 最大寬度不超過視窗寬度減去左側最小空間
      
      setChatPanelWidth(Math.min(Math.max(newWidth, minWidth), maxWidth));
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  // FileTree 拖拽處理邏輯
  const handleFileTreeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingFileTree(true);
    
    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = e.clientX;
      const minWidth = 200;
      const maxWidth = Math.min(500, window.innerWidth - 600); // 確保右側有足夠空間
      
      setFileTreeWidth(Math.min(Math.max(newWidth, minWidth), maxWidth));
    };
    
    const handleMouseUp = () => {
      setIsDraggingFileTree(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
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
          <Button
            type="text"
            icon={isDark ? <SunOutlined /> : <MoonOutlined />}
            onClick={toggleTheme}
            style={{
              color: isDark ? '#fadb14' : '#1890ff',
              fontSize: '16px',
              border: 'none',
              boxShadow: 'none'
            }}
            aria-label={isDark ? t('theme.switchToLight') : t('theme.switchToDark')}
          />
        </Space>
      </Header>
      
      <Content style={contentStyle}>
        <div style={{ display: 'flex', height: '100%' }}>
          {/* Left Pane: File Tree - Resizable Width */}
          <div style={{ 
            width: `${fileTreeWidth}px`,
            minWidth: `${fileTreeWidth}px`,
            maxWidth: `${fileTreeWidth}px`,
            ...sidebarStyle,
            display: 'flex'
          }}>
            {/* FileTree 內容 */}
            <div style={{ 
              flex: 1,
              borderRight: `1px solid ${isDark ? '#303030' : '#f0f0f0'}`,
              overflow: 'hidden'
            }}>
              <FileTree onFileSelect={handleFileSelect} selectedFile={selectedFile} darkMode={isDark} />
            </div>
            
            {/* 拖拽手柄 */}
            <div
              style={{
                width: '4px',
                height: '100%',
                backgroundColor: 'transparent',
                cursor: 'col-resize',
                position: 'relative',
                zIndex: 999
              }}
              onMouseDown={handleFileTreeMouseDown}
            >
              {/* 可見的拖拽指示線 */}
              <div
                style={{
                  position: 'absolute',
                  right: '1px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '2px',
                  height: '40px',
                  backgroundColor: isDark ? '#555' : '#ddd',
                  borderRadius: '1px',
                  opacity: isDraggingFileTree ? 1 : 0.3,
                  transition: 'opacity 0.2s ease'
                }}
              />
            </div>
          </div>
          
          {/* Middle and Right Panes: Content and Chat Panel */}
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            overflow: 'hidden'
          }}>
            {/* Content Viewer - Flexible width */}
            <div style={{ 
              flex: 1, 
              height: '100%',
              overflow: 'hidden'
            }}>
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

            {/* Chat Panel - Always rendered for state persistence */}
            <div
              style={{
                width: chatPanelVisible ? `${chatPanelWidth}px` : '0px',
                minWidth: chatPanelVisible ? `${chatPanelWidth}px` : '0px',
                maxWidth: chatPanelVisible ? `${chatPanelWidth}px` : '0px',
                height: '100%',
                overflow: 'hidden',
                transition: isDragging ? 'none' : 'width 0.3s cubic-bezier(0.4, 0.0, 0.2, 1), min-width 0.3s cubic-bezier(0.4, 0.0, 0.2, 1), max-width 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)',
                display: 'flex',
                backgroundColor: isDark ? '#1f1f1f' : '#fff',
                borderLeft: chatPanelVisible ? `1px solid ${isDark ? '#303030' : '#f0f0f0'}` : 'none'
              }}
            >
              {/* 拖拽手柄 - 只在可見時顯示 */}
              {chatPanelVisible && (
                <div
                  style={{
                    width: '4px',
                    height: '100%',
                    backgroundColor: 'transparent',
                    cursor: 'col-resize',
                    position: 'relative'
                  }}
                  onMouseDown={handleChatPanelMouseDown}
                >
                  {/* 可見的拖拽指示線 */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '1px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '2px',
                      height: '40px',
                      backgroundColor: isDark ? '#555' : '#ddd',
                      borderRadius: '1px',
                      opacity: isDragging ? 1 : 0.3,
                      transition: 'opacity 0.2s ease'
                    }}
                  />
                </div>
              )}
          
              {/* ChatPanel 內容 - 始終渲染以保持狀態 */}
              <div style={{ 
                flex: 1, 
                overflow: 'hidden',
                display: chatPanelVisible ? 'block' : 'none' // 使用 display 控制可見性而非條件渲染
              }}>
                <Suspense fallback={
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    height: '100%',
                    backgroundColor: isDark ? '#1f1f1f' : '#fff'
                  }}>
                    <Spin size="large" />
                  </div>
                }>
                  <ChatPanel darkMode={isDark} />
                </Suspense>
              </div>
            </div>
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