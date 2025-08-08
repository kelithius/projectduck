import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidRendererProps {
  chart: string;
  darkMode?: boolean;
}

export const MermaidRenderer: React.FC<MermaidRendererProps> = ({ chart, darkMode = false }) => {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 配置 Mermaid 主題
    mermaid.initialize({
      startOnLoad: false,
      theme: darkMode ? 'dark' : 'default',
      themeVariables: {
        primaryColor: darkMode ? '#58a6ff' : '#1f2328',
        primaryTextColor: darkMode ? '#e6edf3' : '#24292f',
        primaryBorderColor: darkMode ? '#30363d' : '#d0d7de',
        lineColor: darkMode ? '#6e7681' : '#656d76',
        sectionBkgColor: darkMode ? '#21262d' : '#f6f8fa',
        altSectionBkgColor: darkMode ? '#161b22' : '#ffffff',
        gridColor: darkMode ? '#30363d' : '#d0d7de',
        secondaryColor: darkMode ? '#161b22' : '#ffffff',
        tertiaryColor: darkMode ? '#0d1117' : '#f6f8fa'
      }
    });

    if (elementRef.current) {
      const element = elementRef.current;
      element.innerHTML = '';

      try {
        // 生成唯一 ID
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        
        // 渲染圖表
        mermaid.render(id, chart).then((result) => {
          element.innerHTML = result.svg;
        }).catch((error) => {
          console.error('Mermaid render error:', error);
          element.innerHTML = `
            <div style="
              padding: 20px; 
              border: 1px dashed ${darkMode ? '#30363d' : '#d0d7de'}; 
              border-radius: 6px;
              text-align: center;
              color: ${darkMode ? '#f85149' : '#cf222e'};
              background-color: ${darkMode ? '#0d1117' : '#fff1f0'};
            ">
              <strong>Mermaid 圖表渲染錯誤</strong><br/>
              <small>${error.message}</small>
            </div>
          `;
        });
      } catch (error) {
        console.error('Mermaid error:', error);
        element.innerHTML = `
          <div style="
            padding: 20px; 
            border: 1px dashed ${darkMode ? '#30363d' : '#d0d7de'}; 
            border-radius: 6px;
            text-align: center;
            color: ${darkMode ? '#f85149' : '#cf222e'};
            background-color: ${darkMode ? '#0d1117' : '#fff1f0'};
          ">
            <strong>無法渲染 Mermaid 圖表</strong>
          </div>
        `;
      }
    }
  }, [chart, darkMode]);

  return (
    <div 
      ref={elementRef}
      style={{
        textAlign: 'center',
        margin: '16px 0',
        padding: '16px',
        backgroundColor: darkMode ? '#0d1117' : '#ffffff',
        border: `1px solid ${darkMode ? '#30363d' : '#d0d7de'}`,
        borderRadius: '6px'
      }}
    />
  );
};