import React from 'react';
import { Card } from 'antd';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { prism, vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeViewerProps {
  content: string;
  language: string;
  darkMode?: boolean;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({ content, language, darkMode = false }) => {
  const cardStyle = {
    height: '100%',
    backgroundColor: darkMode ? '#1f1f1f' : '#fff',
    borderColor: darkMode ? '#303030' : '#d9d9d9'
  };

  const getLanguageForHighlighter = (ext: string): string => {
    const langMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'jsx',
      'ts': 'typescript',
      'tsx': 'tsx',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'go': 'go',
      'rs': 'rust',
      'php': 'php',
      'rb': 'ruby',
      'kt': 'kotlin',
      'swift': 'swift',
      'dart': 'dart',
      'scala': 'scala',
      'sh': 'bash',
      'bash': 'bash',
      'zsh': 'bash',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'less': 'less',
      'html': 'html',
      'htm': 'html',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'json': 'json'
    };
    
    return langMap[ext] || 'text';
  };

  return (
    <Card 
      style={{
        ...cardStyle,
        overflow: 'hidden'
      }}
      styles={{
        body: {
          padding: 0,
          height: '100%',
          overflow: 'auto'
        }
      }}
    >
      <SyntaxHighlighter
        language={getLanguageForHighlighter(language)}
        style={darkMode ? vscDarkPlus : prism}
        showLineNumbers={true}
        customStyle={{
          margin: 0,
          backgroundColor: darkMode ? '#1e1e1e' : '#ffffff',
          fontSize: '13px',
          lineHeight: '1.5',
          padding: '16px'
        }}
        key={darkMode ? 'dark' : 'light'}
      >
        {content}
      </SyntaxHighlighter>
    </Card>
  );
};