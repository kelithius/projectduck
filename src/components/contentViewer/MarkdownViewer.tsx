'use client';

import React, { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Card } from 'antd';
import { MermaidRenderer } from './MermaidRenderer';
import { useTranslation } from 'react-i18next';
import 'highlight.js/styles/github.css';

interface MarkdownViewerProps {
  content: string;
  darkMode?: boolean;
}

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ content, darkMode = false }) => {
  const { t } = useTranslation();
  useEffect(() => {
    if (!content) return;
    const codeBlocks = document.querySelectorAll('.markdown-content pre code');
    codeBlocks.forEach((block) => {
      if (darkMode) {
        block.className = block.className.replace('hljs', 'hljs hljs-dark');
      } else {
        block.className = block.className.replace('hljs-dark', '');
      }
    });
  }, [content, darkMode]);

  const cardStyle = {
    height: '100%',
    backgroundColor: darkMode ? '#1f1f1f' : '#fff',
    borderColor: darkMode ? '#303030' : '#d9d9d9',
    overflow: 'hidden'
  };

  const contentStyle = {
    lineHeight: '1.6',
    fontSize: '14px',
    color: darkMode ? '#fff' : '#000',
    height: '100%',
    overflow: 'auto',
    padding: '16px'
  };

  const dynamicStyles = `
    .markdown-content pre {
      background-color: ${darkMode ? '#0d1117' : '#f6f8fa'} !important;
      border: 1px solid ${darkMode ? '#21262d' : '#d0d7de'} !important;
      font-size: 13px !important;
      line-height: 1.5 !important;
    }
    .markdown-content pre code.hljs {
      background-color: ${darkMode ? '#0d1117' : '#f6f8fa'} !important;
      color: ${darkMode ? '#e6edf3' : '#24292f'} !important;
      font-size: 13px !important;
      line-height: 1.5 !important;
    }
    .markdown-content code:not(.hljs) {
      background-color: ${darkMode ? '#6e768166' : '#afb8c133'} !important;
      color: ${darkMode ? '#e6edf3' : '#24292f'} !important;
      padding: 2px 4px !important;
      border-radius: 3px !important;
      font-size: 13px !important;
    }
    
    ${darkMode ? `
    .markdown-content .hljs-comment,
    .markdown-content .hljs-quote {
      color: #8b949e !important;
    }
    .markdown-content .hljs-keyword,
    .markdown-content .hljs-selector-tag,
    .markdown-content .hljs-literal,
    .markdown-content .hljs-section,
    .markdown-content .hljs-link {
      color: #ff7b72 !important;
    }
    .markdown-content .hljs-string {
      color: #a5d6ff !important;
    }
    .markdown-content .hljs-title,
    .markdown-content .hljs-name,
    .markdown-content .hljs-type,
    .markdown-content .hljs-attribute {
      color: #d2a8ff !important;
    }
    .markdown-content .hljs-number,
    .markdown-content .hljs-symbol,
    .markdown-content .hljs-bullet {
      color: #79c0ff !important;
    }
    .markdown-content .hljs-built_in,
    .markdown-content .hljs-builtin-name {
      color: #ffa657 !important;
    }
    .markdown-content .hljs-variable,
    .markdown-content .hljs-template-variable {
      color: #ffa657 !important;
    }
    .markdown-content .hljs-addition {
      color: #aff5b4 !important;
      background-color: #033a16 !important;
    }
    .markdown-content .hljs-deletion {
      color: #ffdcd7 !important;
      background-color: #67060c !important;
    }
    ` : `
    .markdown-content .hljs-comment,
    .markdown-content .hljs-quote {
      color: #6a737d !important;
    }
    .markdown-content .hljs-keyword,
    .markdown-content .hljs-selector-tag,
    .markdown-content .hljs-literal,
    .markdown-content .hljs-section,
    .markdown-content .hljs-link {
      color: #d73a49 !important;
    }
    .markdown-content .hljs-string {
      color: #032f62 !important;
    }
    .markdown-content .hljs-title,
    .markdown-content .hljs-name,
    .markdown-content .hljs-type,
    .markdown-content .hljs-attribute {
      color: #6f42c1 !important;
    }
    .markdown-content .hljs-number,
    .markdown-content .hljs-symbol,
    .markdown-content .hljs-bullet {
      color: #005cc5 !important;
    }
    .markdown-content .hljs-built_in,
    .markdown-content .hljs-builtin-name {
      color: #e36209 !important;
    }
    .markdown-content .hljs-variable,
    .markdown-content .hljs-template-variable {
      color: #e36209 !important;
    }
    `}
  `;

  useEffect(() => {
    if (!content) return;
    
    const styleId = 'markdown-dynamic-styles';
    let styleElement = document.getElementById(styleId);
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }
    
    styleElement.textContent = dynamicStyles;
  }, [darkMode, dynamicStyles, content]);

  if (!content) {
    return (
      <Card style={{ height: '100%', backgroundColor: darkMode ? '#1f1f1f' : '#fff' }}>
        <div style={{ padding: '20px', textAlign: 'center', color: darkMode ? '#fff' : '#000' }}>
{t('fileViewer.loading')}
        </div>
      </Card>
    );
  }

  return (
    <Card 
      style={cardStyle}
      styles={{ body: { padding: 0, height: '100%' } }}
    >
      <div 
        className="markdown-content"
        style={contentStyle}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[
            [rehypeHighlight, { 
              ignoreMissing: true,
              aliases: {
                http: 'bash',
                shell: 'bash'
              }
            }]
          ]}
          components={{
            h1: ({ children }) => (
              <h1 style={{ 
                borderBottom: `2px solid ${darkMode ? '#404040' : '#eaecef'}`, 
                paddingBottom: '10px',
                marginTop: '24px',
                marginBottom: '16px',
                color: darkMode ? '#fff' : '#000'
              }}>
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 style={{ 
                borderBottom: `1px solid ${darkMode ? '#404040' : '#eaecef'}`, 
                paddingBottom: '8px',
                marginTop: '24px',
                marginBottom: '16px',
                color: darkMode ? '#fff' : '#000'
              }}>
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 style={{ 
                marginTop: '24px',
                marginBottom: '16px',
                color: darkMode ? '#fff' : '#000'
              }}>
                {children}
              </h3>
            ),
            code: ({ inline, className, children, ...props }: React.HTMLAttributes<HTMLElement> & { inline?: boolean }) => {
              if (inline) {
                return (
                  <code 
                    style={{ 
                      backgroundColor: darkMode ? '#2d2d2d' : '#f6f8fa',
                      color: darkMode ? '#e6e6e6' : '#000',
                      padding: '2px 4px',
                      borderRadius: '3px',
                      fontSize: '13px'
                    }}
                    {...props}
                  >
                    {children}
                  </code>
                );
              }

              const code = String(children).replace(/\n$/, '');
              if (className === 'language-mermaid') {
                return <MermaidRenderer chart={code} darkMode={darkMode} />;
              }

              if (className === 'language-plantuml') {
                return (
                  <div style={{
                    padding: '16px',
                    backgroundColor: darkMode ? '#1e1e1e' : '#f6f8fa',
                    border: `1px solid ${darkMode ? '#30363d' : '#d0d7de'}`,
                    borderRadius: '6px',
                    textAlign: 'center',
                    color: darkMode ? '#7d8590' : '#656d76',
                    margin: '16px 0'
                  }}>
                    <strong>PlantUML 圖表支援開發中</strong><br/>
                    <small>目前尚未實作 PlantUML 渲染功能</small>
                  </div>
                );
              }

              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            },
            pre: ({ children }) => (
              <div style={{ marginBottom: '16px' }}>
                <pre 
                  style={{ 
                    backgroundColor: darkMode ? '#1e1e1e' : '#f6f8fa',
                    padding: '16px',
                    borderRadius: '6px',
                    overflow: 'auto',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    border: `1px solid ${darkMode ? '#404040' : '#d0d7de'}`,
                    margin: 0
                  }}
                >
                  {children}
                </pre>
              </div>
            ),
            table: ({ children }) => (
              <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
                <table style={{ 
                  width: '100%',
                  borderCollapse: 'collapse',
                  border: `1px solid ${darkMode ? '#404040' : '#d0d7de'}`
                }}>
                  {children}
                </table>
              </div>
            ),
            th: ({ children }) => (
              <th style={{ 
                padding: '6px 13px',
                border: `1px solid ${darkMode ? '#404040' : '#d0d7de'}`,
                backgroundColor: darkMode ? '#2d2d2d' : '#f6f8fa',
                color: darkMode ? '#fff' : '#000',
                fontWeight: 600
              }}>
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td style={{ 
                padding: '6px 13px',
                border: `1px solid ${darkMode ? '#404040' : '#d0d7de'}`,
                color: darkMode ? '#e6e6e6' : '#000'
              }}>
                {children}
              </td>
            ),
            blockquote: ({ children }) => (
              <blockquote style={{ 
                padding: '0 1em',
                color: darkMode ? '#b3b3b3' : '#656d76',
                borderLeft: `4px solid ${darkMode ? '#404040' : '#d0d7de'}`,
                margin: '0 0 16px 0'
              }}>
                {children}
              </blockquote>
            ),
            a: ({ children, href }: { children?: React.ReactNode; href?: string }) => (
              <a 
                href={href} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ 
                  color: darkMode ? '#58a6ff' : '#0969da', 
                  textDecoration: 'none' 
                }}
                onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'}
                onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}
              >
                {children}
              </a>
            ),
            img: ({ src, alt }: { src?: string; alt?: string }) => (
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
            hr: () => (
              <hr style={{ 
                height: '2px',
                padding: 0,
                margin: '24px 0',
                backgroundColor: darkMode ? '#404040' : '#d0d7de',
                border: 0
              }} />
            ),
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
        >
          {content}
        </ReactMarkdown>
      </div>
    </Card>
  );
};