import React, { useState, useEffect } from 'react';
import { ConfigProvider, theme, App as AntdApp } from 'antd';
import { AppLayout } from '@/components/layout/AppLayout';

const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState(false);

  // 監聽主題變化
  useEffect(() => {
    const handleStorageChange = () => {
      const savedTheme = localStorage.getItem('projectduck-theme');
      setDarkMode(savedTheme === 'dark');
    };

    // 初始載入
    handleStorageChange();

    // 監聽 storage 變化
    window.addEventListener('storage', handleStorageChange);
    
    // 自訂事件監聽（用於同頁面內的主題切換）
    const handleThemeChange = (e: CustomEvent) => {
      setDarkMode(e.detail.isDark);
    };
    
    window.addEventListener('themeChange', handleThemeChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('themeChange', handleThemeChange as EventListener);
    };
  }, []);

  return (
    <ConfigProvider
      theme={{
        algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1890ff',
        },
      }}
    >
      <AntdApp>
        <div className="App" style={{ height: '100vh' }}>
          <AppLayout />
        </div>
      </AntdApp>
    </ConfigProvider>
  );
};

export default App;