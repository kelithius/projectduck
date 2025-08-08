import React from 'react';
import { ConfigProvider, Layout } from 'antd';
import { AppLayout } from '@/components/layout/AppLayout';

const App: React.FC = () => {
  return (
    <ConfigProvider
      theme={{
        token: {
          // 自訂主題色彩
          colorPrimary: '#1890ff',
        },
      }}
    >
      <div className="App" style={{ height: '100vh' }}>
        <AppLayout />
      </div>
    </ConfigProvider>
  );
};

export default App;