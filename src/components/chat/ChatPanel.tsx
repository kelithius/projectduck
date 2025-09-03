'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, Input, Button, List, Avatar, Space, Upload, message as antdMessage, Spin } from 'antd';
import { SendOutlined, PaperClipOutlined, RobotOutlined, UserOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import { Message, FileAttachment } from '@/lib/types/chat';
import claudeCodeService from '@/lib/services/claudeCodeService';
import { useProject } from '@/lib/providers/project-provider';

const { TextArea } = Input;

interface ChatPanelProps {
  darkMode?: boolean;
  className?: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ darkMode = false, className }) => {
  const { t } = useTranslation();
  const { getCurrentBasePath } = useProject();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<File[]>([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // 檢查認證狀態
    const checkAuth = async () => {
      const authStatus = await claudeCodeService.checkAuthentication();
      setIsAuthenticated(authStatus);
    };
    
    checkAuth();
  }, []);

  const handleSendMessage = async () => {
    if (!inputValue.trim() && attachments.length === 0) return;
    if (!isAuthenticated) {
      antdMessage.warning('請先完成 Claude Code 認證');
      return;
    }

    const newMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
      attachments: attachments.length > 0 ? attachments : undefined,
      status: 'sending'
    };

    setMessages(prev => [...prev, newMessage]);
    const messageContent = inputValue.trim();
    const messageAttachments = [...fileInputRef.current];
    setInputValue('');
    setAttachments([]);
    fileInputRef.current = [];
    setIsLoading(true);

    try {
      const currentProject = getCurrentBasePath();
      const response = await claudeCodeService.sendMessage({
        content: messageContent,
        attachments: messageAttachments,
        projectPath: currentProject || undefined
      });

      setMessages(prev => 
        prev.map(msg => 
          msg.id === newMessage.id ? { ...msg, status: 'sent' as const } : msg
        )
      );

      if (response.success && response.data?.message) {
        const assistantMessage: Message = {
          id: uuidv4(),
          role: 'assistant',
          content: response.data.message,
          timestamp: new Date(),
          status: 'sent'
        };
        
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(response.error || '未知錯誤');
      }
    } catch (error) {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === newMessage.id ? { ...msg, status: 'error' as const } : msg
        )
      );
      antdMessage.error(error instanceof Error ? error.message : '發送失敗，請重試');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileUpload = (file: File) => {
    const attachment: FileAttachment = {
      id: uuidv4(),
      name: file.name,
      type: file.type,
      size: file.size
    };
    
    setAttachments(prev => [...prev, attachment]);
    fileInputRef.current.push(file);
    return false; // 阻止自動上傳
  };

  const removeAttachment = (id: string) => {
    const attachmentIndex = attachments.findIndex(att => att.id === id);
    if (attachmentIndex !== -1) {
      // 同時移除檔案引用
      fileInputRef.current.splice(attachmentIndex, 1);
    }
    setAttachments(prev => prev.filter(att => att.id !== id));
  };

  const panelStyle = {
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    backgroundColor: darkMode ? '#1f1f1f' : '#fff',
    border: darkMode ? '1px solid #303030' : '1px solid #d9d9d9'
  };

  const headerStyle = {
    padding: '12px 16px',
    borderBottom: darkMode ? '1px solid #303030' : '1px solid #f0f0f0',
    backgroundColor: darkMode ? '#141414' : '#fafafa'
  };

  const messagesStyle = {
    flex: 1,
    overflow: 'auto',
    padding: '16px'
  };

  const inputAreaStyle = {
    padding: '16px',
    borderTop: darkMode ? '1px solid #303030' : '1px solid #f0f0f0',
    backgroundColor: darkMode ? '#141414' : '#fafafa'
  };

  return (
    <Card style={panelStyle} bodyStyle={{ padding: 0, height: '100%', display: 'flex', flexDirection: 'column' }} className={className}>
      {/* Header */}
      <div style={headerStyle}>
        <Space align="center">
          <RobotOutlined style={{ color: darkMode ? '#1890ff' : '#1890ff', fontSize: '16px' }} />
          <span style={{ color: darkMode ? '#fff' : '#000', fontWeight: 500 }}>
            Claude Code
          </span>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: isAuthenticated === null 
              ? '#faad14' 
              : isAuthenticated 
                ? '#52c41a' 
                : '#ff4d4f',
            marginLeft: '8px'
          }} />
          <span style={{ 
            color: darkMode ? '#999' : '#666', 
            fontSize: '12px' 
          }}>
            {isAuthenticated === null 
              ? '檢查中...' 
              : isAuthenticated 
                ? '已連接' 
                : '未認證'
            }
          </span>
        </Space>
      </div>

      {/* Messages Area */}
      <div style={messagesStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {messages.map((message) => (
            <div key={message.id} style={{
              display: 'flex',
              justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
              alignItems: 'flex-start',
              gap: '8px'
            }}>
              {message.role !== 'user' && (
                <Avatar 
                  icon={<RobotOutlined />} 
                  size={32}
                  style={{ 
                    backgroundColor: darkMode ? '#52c41a' : '#52c41a',
                    flexShrink: 0
                  }}
                />
              )}
              
              <div style={{
                maxWidth: '70%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: message.role === 'user' ? 'flex-end' : 'flex-start'
              }}>
                {/* 訊息標題 */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '4px',
                  flexDirection: message.role === 'user' ? 'row-reverse' : 'row'
                }}>
                  <span style={{ 
                    color: darkMode ? '#999' : '#666', 
                    fontSize: '12px',
                    fontWeight: 500
                  }}>
                    {message.role === 'user' ? '您' : 'Claude'}
                  </span>
                  <span style={{ 
                    color: darkMode ? '#666' : '#999', 
                    fontSize: '11px' 
                  }}>
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                  {message.status === 'sending' && <Spin size="small" />}
                </div>

                {/* 訊息氣泡 */}
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '18px',
                  backgroundColor: message.role === 'user'
                    ? (darkMode ? '#1890ff' : '#1890ff')
                    : (darkMode ? '#262626' : '#f5f5f5'),
                  color: message.role === 'user'
                    ? '#fff'
                    : (darkMode ? '#e6e6e6' : '#000'),
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap',
                  position: 'relative',
                  boxShadow: darkMode 
                    ? '0 1px 3px rgba(0,0,0,0.3)' 
                    : '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  {message.content}
                  
                  {/* 訊息狀態指示器 */}
                  {message.role === 'user' && message.status === 'error' && (
                    <div style={{
                      position: 'absolute',
                      bottom: '-6px',
                      right: '8px',
                      fontSize: '10px',
                      color: '#ff4d4f'
                    }}>
                      ⚠
                    </div>
                  )}
                </div>

                {/* 附件顯示 */}
                {message.attachments && message.attachments.length > 0 && (
                  <div style={{ 
                    marginTop: '6px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '4px',
                    justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start'
                  }}>
                    {message.attachments.map(att => (
                      <div key={att.id} style={{ 
                        color: darkMode ? '#999' : '#666',
                        fontSize: '11px',
                        padding: '2px 6px',
                        backgroundColor: darkMode ? '#1f1f1f' : '#fafafa',
                        borderRadius: '10px',
                        border: darkMode ? '1px solid #303030' : '1px solid #e8e8e8'
                      }}>
                        📎 {att.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {message.role === 'user' && (
                <Avatar 
                  icon={<UserOutlined />} 
                  size={32}
                  style={{ 
                    backgroundColor: darkMode ? '#1890ff' : '#1890ff',
                    flexShrink: 0
                  }}
                />
              )}
            </div>
          ))}
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={inputAreaStyle}>
        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div style={{ marginBottom: '8px' }}>
            {attachments.map(att => (
              <div key={att.id} style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '4px 8px',
                backgroundColor: darkMode ? '#262626' : '#f5f5f5',
                borderRadius: '4px',
                marginRight: '8px',
                fontSize: '12px'
              }}>
                <span style={{ color: darkMode ? '#e6e6e6' : '#000' }}>📎 {att.name}</span>
                <Button 
                  type="text" 
                  size="small" 
                  onClick={() => removeAttachment(att.id)}
                  style={{ padding: '0 4px', marginLeft: '4px' }}
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
        )}

        <Space.Compact style={{ width: '100%' }}>
          <TextArea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="輸入訊息... (Enter 發送, Shift+Enter 換行)"
            autoSize={{ minRows: 1, maxRows: 4 }}
            style={{ 
              flex: 1,
              backgroundColor: darkMode ? '#1f1f1f' : '#fff',
              borderColor: darkMode ? '#303030' : '#d9d9d9',
              color: darkMode ? '#fff' : '#000'
            }}
            disabled={isLoading}
          />
          <Upload
            beforeUpload={handleFileUpload}
            showUploadList={false}
            multiple
          >
            <Button 
              icon={<PaperClipOutlined />} 
              disabled={isLoading}
              style={{
                borderColor: darkMode ? '#303030' : '#d9d9d9',
                backgroundColor: darkMode ? '#1f1f1f' : '#fff',
                color: darkMode ? '#fff' : '#000'
              }}
            />
          </Upload>
          <Button 
            type="primary" 
            icon={<SendOutlined />} 
            onClick={handleSendMessage}
            loading={isLoading}
            disabled={!inputValue.trim() && attachments.length === 0}
          />
        </Space.Compact>
      </div>
    </Card>
  );
};