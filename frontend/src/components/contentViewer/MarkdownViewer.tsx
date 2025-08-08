import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Card } from 'antd';
import 'highlight.js/styles/github.css';

interface MarkdownViewerProps {
  content: string;
}

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ content }) => {
  return (
    <Card style={{ height: '100%' }}>
      <div 
        className="markdown-content"
        style={{
          lineHeight: '1.6',
          fontSize: '14px'
        }}
      >
        <ReactMarkdown
          children={content}
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={{
            // 自訂標題樣式
            h1: ({ children }) => (
              <h1 style={{ 
                borderBottom: '2px solid #eaecef', 
                paddingBottom: '10px',
                marginTop: '24px',
                marginBottom: '16px'
              }}>
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 style={{ 
                borderBottom: '1px solid #eaecef', 
                paddingBottom: '8px',
                marginTop: '24px',
                marginBottom: '16px'
              }}>
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 style={{ 
                marginTop: '24px',
                marginBottom: '16px'
              }}>
                {children}
              </h3>
            ),
            // 程式碼區塊樣式
            code: ({ node, inline, className, children, ...props }) => {
              if (inline) {
                return (
                  <code 
                    style={{ 
                      backgroundColor: '#f6f8fa',
                      padding: '2px 4px',
                      borderRadius: '3px',
                      fontSize: '85%'
                    }}
                    {...props}
                  >
                    {children}
                  </code>
                );
              }
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            },
            // 表格樣式
            table: ({ children }) => (
              <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
                <table style={{ 
                  width: '100%',
                  borderCollapse: 'collapse',
                  border: '1px solid #d0d7de'
                }}>
                  {children}
                </table>
              </div>
            ),
            th: ({ children }) => (
              <th style={{ 
                padding: '6px 13px',
                border: '1px solid #d0d7de',
                backgroundColor: '#f6f8fa',
                fontWeight: 600
              }}>
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td style={{ 
                padding: '6px 13px',
                border: '1px solid #d0d7de'
              }}>
                {children}
              </td>
            ),
            // 引用區塊樣式
            blockquote: ({ children }) => (
              <blockquote style={{ 
                padding: '0 1em',
                color: '#656d76',
                borderLeft: '4px solid #d0d7de',
                margin: '0 0 16px 0'
              }}>
                {children}
              </blockquote>
            ),
            // 連結樣式
            a: ({ children, href }) => (
              <a 
                href={href} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: '#0969da', textDecoration: 'none' }}
                onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'}
                onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}
              >
                {children}
              </a>
            ),
            // 圖片樣式
            img: ({ src, alt }) => (
              <img 
                src={src} 
                alt={alt} 
                style={{ 
                  maxWidth: '100%',
                  height: 'auto',
                  borderRadius: '6px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}
              />
            ),
            // 水平線樣式
            hr: () => (
              <hr style={{ 
                height: '2px',
                padding: 0,
                margin: '24px 0',
                backgroundColor: '#d0d7de',
                border: 0
              }} />
            ),
            // 列表樣式
            ul: ({ children }) => (
              <ul style={{ marginBottom: '16px', paddingLeft: '2em' }}>
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol style={{ marginBottom: '16px', paddingLeft: '2em' }}>
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li style={{ marginBottom: '4px' }}>
                {children}
              </li>
            ),
          }}
        />
      </div>
    </Card>
  );
};