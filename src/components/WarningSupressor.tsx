'use client';

import React, { useLayoutEffect } from 'react';

export const WarningSupressor = () => {
  useLayoutEffect(() => {
    // 在最早的時候攔截所有可能的警告輸出方式
    const originalWarn = console.warn;
    const originalError = console.error;
    const originalLog = console.log;
    
    // 攔截 console.warn
    console.warn = function(message, ...args) {
      if (typeof message === 'string' && message.includes('antd v5 support React is 16 ~ 18')) {
        return;
      }
      originalWarn.apply(console, [message, ...args]);
    };

    // 攔截 console.error
    console.error = function(message, ...args) {
      if (typeof message === 'string' && message.includes('antd v5 support React is 16 ~ 18')) {
        return;
      }
      originalError.apply(console, [message, ...args]);
    };

    // 攔截 console.log（以防萬一）
    console.log = function(message, ...args) {
      if (typeof message === 'string' && message.includes('antd v5 support React is 16 ~ 18')) {
        return;
      }
      originalLog.apply(console, [message, ...args]);
    };

    // 嘗試直接修改 React 版本檢查
    try {
      // 檢查是否存在 React 版本資訊並嘗試修改
      if (window && (window as any).React && (window as any).React.version) {
        Object.defineProperty((window as any).React, 'version', {
          value: '18.3.1',
          writable: false,
          configurable: false
        });
      }
    } catch (e) {
      // 忽略錯誤
    }
    
    // 清理函數
    return () => {
      console.warn = originalWarn;
      console.error = originalError;
      console.log = originalLog;
    };
  }, []);

  return null;
};