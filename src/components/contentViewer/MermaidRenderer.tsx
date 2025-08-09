'use client';

import React from 'react';

interface MermaidRendererProps {
  chart: string;
  darkMode?: boolean;
}

export const MermaidRenderer: React.FC<MermaidRendererProps> = ({ chart, darkMode = false }) => {
  return (
    <div 
      style={{
        textAlign: 'center',
        margin: '16px 0',
        padding: '20px',
        backgroundColor: darkMode ? '#0d1117' : '#f6f8fa',
        border: `1px solid ${darkMode ? '#30363d' : '#d0d7de'}`,
        borderRadius: '6px',
        color: darkMode ? '#7d8590' : '#656d76'
      }}
    >
      <strong>Mermaid 圖表</strong><br/>
      <small>圖表渲染功能暫時不可用</small>
      <details style={{ marginTop: '10px', textAlign: 'left' }}>
        <summary style={{ cursor: 'pointer' }}>顯示原始碼</summary>
        <pre style={{ 
          marginTop: '10px', 
          padding: '10px', 
          backgroundColor: darkMode ? '#161b22' : '#ffffff',
          border: `1px solid ${darkMode ? '#21262d' : '#e1e4e8'}`,
          borderRadius: '3px',
          fontSize: '12px',
          overflow: 'auto'
        }}>
          {chart}
        </pre>
      </details>
    </div>
  );
};