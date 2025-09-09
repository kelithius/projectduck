'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Result, Button, Typography, Card, Space } from 'antd';
import { ReloadOutlined, BugOutlined, HomeOutlined } from '@ant-design/icons';

const { Paragraph, Text } = Typography;

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private readonly maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // 產生錯誤 ID 用於追蹤
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 記錄詳細錯誤資訊
    console.error('[ErrorBoundary] Caught error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      retryCount: this.retryCount,
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'SSR',
    });

    this.setState({
      errorInfo,
    });

    // 呼叫自訂錯誤處理函數
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // 發送錯誤到監控服務 (可選)
    this.reportError(error, errorInfo);
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    // 這裡可以整合錯誤監控服務 (例如 Sentry)
    if (typeof window !== 'undefined' && window.console) {
      console.group(`🚨 Error Boundary Report [${this.state.errorId}]`);
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
      console.error('Component Stack:', errorInfo.componentStack);
      console.error('Retry Count:', this.retryCount);
      console.groupEnd();
    }
  };

  private handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      console.log(`[ErrorBoundary] Retrying... (${this.retryCount}/${this.maxRetries})`);
      
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: '',
      });
    } else {
      console.warn('[ErrorBoundary] Max retries reached, please refresh the page');
    }
  };

  private handleRefresh = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  private handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      // 如果有自訂 fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 預設錯誤 UI
      const { error, errorInfo, errorId } = this.state;
      const canRetry = this.retryCount < this.maxRetries;
      const isProduction = process.env.NODE_ENV === 'production';

      return (
        <div style={{ 
          padding: '40px 24px', 
          minHeight: '400px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Card style={{ maxWidth: '600px', width: '100%' }}>
            <Result
              status="error"
              icon={<BugOutlined style={{ color: '#ff4d4f' }} />}
              title="哎呀！出現了一個錯誤"
              subTitle={
                isProduction 
                  ? "應用程式遇到未預期的問題，請嘗試重新載入頁面。" 
                  : error?.message || "發生未知錯誤"
              }
              extra={
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Space wrap>
                    {canRetry && (
                      <Button 
                        type="primary" 
                        icon={<ReloadOutlined />}
                        onClick={this.handleRetry}
                      >
                        重試 ({this.maxRetries - this.retryCount} 次剩餘)
                      </Button>
                    )}
                    <Button 
                      icon={<ReloadOutlined />}
                      onClick={this.handleRefresh}
                    >
                      重新載入頁面
                    </Button>
                    <Button 
                      icon={<HomeOutlined />}
                      onClick={this.handleGoHome}
                    >
                      回到首頁
                    </Button>
                  </Space>
                  
                  {!isProduction && error && (
                    <Card size="small" style={{ textAlign: 'left', marginTop: '16px' }}>
                      <Typography>
                        <Text strong>錯誤 ID: </Text>
                        <Text code>{errorId}</Text>
                        <br />
                        <Text strong>錯誤類型: </Text>
                        <Text code>{error.name}</Text>
                        <br />
                        <Text strong>錯誤訊息: </Text>
                        <Paragraph>
                          <Text code style={{ whiteSpace: 'pre-wrap' }}>
                            {error.message}
                          </Text>
                        </Paragraph>
                        
                        {error.stack && (
                          <>
                            <Text strong>錯誤堆疊: </Text>
                            <Paragraph>
                              <Text code style={{ 
                                whiteSpace: 'pre-wrap', 
                                fontSize: '12px',
                                display: 'block',
                                maxHeight: '200px',
                                overflow: 'auto'
                              }}>
                                {error.stack}
                              </Text>
                            </Paragraph>
                          </>
                        )}
                        
                        {errorInfo?.componentStack && (
                          <>
                            <Text strong>元件堆疊: </Text>
                            <Paragraph>
                              <Text code style={{ 
                                whiteSpace: 'pre-wrap', 
                                fontSize: '12px',
                                display: 'block',
                                maxHeight: '150px',
                                overflow: 'auto'
                              }}>
                                {errorInfo.componentStack}
                              </Text>
                            </Paragraph>
                          </>
                        )}
                      </Typography>
                    </Card>
                  )}
                </Space>
              }
            />
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// 高階組件版本，用於包裝函數式組件
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};