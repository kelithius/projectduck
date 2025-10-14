'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Transformer } from 'markmap-lib';
import { Markmap } from 'markmap-view';
import { Alert } from 'antd';
import { useTranslation } from 'react-i18next';
import hljs from 'highlight.js';
import '@/styles/code-highlight.css';

interface MarkmapRendererProps {
  content: string;
  darkMode?: boolean;
}

export const MarkmapRenderer: React.FC<MarkmapRendererProps> = ({ content, darkMode = false }) => {
  const { t } = useTranslation();
  const svgRef = useRef<SVGSVGElement>(null);
  const mmRef = useRef<Markmap | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Inject official Markmap dark mode styles
  useEffect(() => {
    const styleId = 'markmap-official-dark-styles';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;

    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }

    // Markmap styles - match Markdown preview for both light and dark modes
    // Using same color scheme as MarkdownViewer
    styleElement.textContent = `
      /* Light mode */
      .markmap {
        background: #fff;
      }

      /* Light mode - inline code */
      .markmap-foreign code {
        background-color: #f6f8fa !important;
        color: #000 !important;
        padding: 2px 4px !important;
        border-radius: 3px !important;
        font-size: 13px !important;
      }

      /* Light mode - code blocks */
      .markmap-foreign pre {
        background-color: #f6f8fa !important;
        border: 1px solid #d0d7de !important;
        font-size: 13px !important;
        line-height: 1.5 !important;
      }

      .markmap-foreign pre code.hljs {
        background-color: #f6f8fa !important;
        color: #24292f !important;
        font-size: 13px !important;
        line-height: 1.5 !important;
      }

      /* Light mode - syntax highlighting tokens */
      .markmap-foreign .hljs-comment,
      .markmap-foreign .hljs-quote {
        color: #6a737d !important;
      }
      .markmap-foreign .hljs-keyword,
      .markmap-foreign .hljs-selector-tag,
      .markmap-foreign .hljs-literal,
      .markmap-foreign .hljs-section,
      .markmap-foreign .hljs-link {
        color: #d73a49 !important;
      }
      .markmap-foreign .hljs-string {
        color: #032f62 !important;
      }
      .markmap-foreign .hljs-title,
      .markmap-foreign .hljs-name,
      .markmap-foreign .hljs-type,
      .markmap-foreign .hljs-attribute {
        color: #6f42c1 !important;
      }
      .markmap-foreign .hljs-number,
      .markmap-foreign .hljs-symbol,
      .markmap-foreign .hljs-bullet {
        color: #005cc5 !important;
      }
      .markmap-foreign .hljs-built_in,
      .markmap-foreign .hljs-builtin-name {
        color: #e36209 !important;
      }
      .markmap-foreign .hljs-variable,
      .markmap-foreign .hljs-template-variable {
        color: #e36209 !important;
      }

      /* Dark mode */
      .markmap-dark {
        background: #1f1f1f;
        color: #fff;
      }

      .markmap-dark .markmap {
        background: #1f1f1f;
      }

      .markmap-dark .markmap-foreign {
        color: #fff;
      }

      /* Dark mode - inline code */
      .markmap-dark .markmap-foreign code {
        background-color: #2d2d2d !important;
        color: #e6e6e6 !important;
        padding: 2px 4px !important;
        border-radius: 3px !important;
        font-size: 13px !important;
      }

      /* Dark mode - code blocks */
      .markmap-dark .markmap-foreign pre {
        background-color: #0d1117 !important;
        border: 1px solid #21262d !important;
        font-size: 13px !important;
        line-height: 1.5 !important;
      }

      .markmap-dark .markmap-foreign pre code.hljs {
        background-color: #0d1117 !important;
        color: #e6edf3 !important;
        font-size: 13px !important;
        line-height: 1.5 !important;
      }

      /* Dark mode - syntax highlighting tokens */
      .markmap-dark .markmap-foreign .hljs-comment,
      .markmap-dark .markmap-foreign .hljs-quote {
        color: #8b949e !important;
      }
      .markmap-dark .markmap-foreign .hljs-keyword,
      .markmap-dark .markmap-foreign .hljs-selector-tag,
      .markmap-dark .markmap-foreign .hljs-literal,
      .markmap-dark .markmap-foreign .hljs-section,
      .markmap-dark .markmap-foreign .hljs-link {
        color: #ff7b72 !important;
      }
      .markmap-dark .markmap-foreign .hljs-string {
        color: #a5d6ff !important;
      }
      .markmap-dark .markmap-foreign .hljs-title,
      .markmap-dark .markmap-foreign .hljs-name,
      .markmap-dark .markmap-foreign .hljs-type,
      .markmap-dark .markmap-foreign .hljs-attribute {
        color: #d2a8ff !important;
      }
      .markmap-dark .markmap-foreign .hljs-number,
      .markmap-dark .markmap-foreign .hljs-symbol,
      .markmap-dark .markmap-foreign .hljs-bullet {
        color: #79c0ff !important;
      }
      .markmap-dark .markmap-foreign .hljs-built_in,
      .markmap-dark .markmap-foreign .hljs-builtin-name {
        color: #ffa657 !important;
      }
      .markmap-dark .markmap-foreign .hljs-variable,
      .markmap-dark .markmap-foreign .hljs-template-variable {
        color: #ffa657 !important;
      }
      .markmap-dark .markmap-foreign .hljs-addition {
        color: #aff5b4 !important;
        background-color: #033a16 !important;
      }
      .markmap-dark .markmap-foreign .hljs-deletion {
        color: #ffdcd7 !important;
        background-color: #67060c !important;
      }
    `;

    return () => {
      // Keep styles in DOM for reuse
    };
  }, [darkMode]);

  // Sync dark mode class with ProjectDuck theme
  useEffect(() => {
    if (containerRef.current) {
      if (darkMode) {
        containerRef.current.classList.add('markmap-dark');
      } else {
        containerRef.current.classList.remove('markmap-dark');
      }
    }
  }, [darkMode]);

  // Initialize and render markmap
  useEffect(() => {
    if (!svgRef.current || !content) return;

    try {
      setError(null);

      // Create transformer instance with highlight.js enabled
      const transformer = new Transformer();

      // Transform markdown to markmap data
      const { root } = transformer.transform(content);

      // Create or update markmap instance
      if (!mmRef.current) {
        mmRef.current = Markmap.create(svgRef.current, {
          duration: 300,
          maxWidth: 300,
          paddingX: 8,
          spacingVertical: 10,
          spacingHorizontal: 80,
        });
      }

      // Render the markmap
      mmRef.current.setData(root);
      mmRef.current.fit();

      // Apply highlight.js to code blocks after rendering
      setTimeout(() => {
        const codeBlocks = svgRef.current?.querySelectorAll('pre code');
        if (codeBlocks) {
          codeBlocks.forEach((block) => {
            hljs.highlightElement(block as HTMLElement);
          });
        }
      }, 100);

    } catch (err) {
      console.error('[MarkmapRenderer] Error rendering markmap:', err);
      setError(err instanceof Error ? err.message : 'Failed to render markmap');
    }

    // Cleanup function
    return () => {
      if (mmRef.current) {
        mmRef.current.destroy();
        mmRef.current = null;
      }
    };
  }, [content]);

  // Re-render when theme changes
  useEffect(() => {
    if (mmRef.current && content) {
      const transformer = new Transformer();
      const { root } = transformer.transform(content);
      mmRef.current.setData(root);
      mmRef.current.fit();

      // Re-apply highlight.js after theme change
      setTimeout(() => {
        const codeBlocks = svgRef.current?.querySelectorAll('pre code');
        if (codeBlocks) {
          codeBlocks.forEach((block) => {
            hljs.highlightElement(block as HTMLElement);
          });
        }
      }, 100);
    }
  }, [darkMode, content]);

  if (error) {
    return (
      <Alert
        message={t('markmap.error', 'Markmap 渲染錯誤')}
        description={error}
        type="error"
        showIcon
        style={{ margin: '16px 0' }}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        minHeight: '600px',
        position: 'relative',
        backgroundColor: darkMode ? '#1f1f1f' : '#fff',
        overflow: 'hidden',
      }}
    >
      <svg
        ref={svgRef}
        className="markmap"
        style={{
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
};
