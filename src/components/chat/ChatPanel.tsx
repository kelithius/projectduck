'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, Input, Button, List, Avatar, Space, Upload, Spin, App } from 'antd';
import { SendOutlined, PaperClipOutlined, RobotOutlined, UserOutlined, CloseOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import { Message, FileAttachment } from '@/lib/types/chat';
import claudeCodeService, { type StreamEvent } from '@/lib/services/claudeCodeService';
import { useProject } from '@/lib/providers/project-provider';
import type { SDKMessage } from '@anthropic-ai/claude-code';
import MessageBubble, { type ToolActivity } from './MessageBubble';

const { TextArea } = Input;

interface ChatPanelProps {
  darkMode?: boolean;
  className?: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ darkMode = false, className }) => {
  const { t } = useTranslation();
  const { getCurrentBasePath } = useProject();
  const { message } = App.useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [currentAssistantMessage, setCurrentAssistantMessage] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [toolActivities, setToolActivities] = useState<Map<string, ToolActivity[]>>(new Map());
  const [currentAssistantMessageId, setCurrentAssistantMessageId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<File[]>([]);
  const currentSessionRef = useRef<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentAssistantMessage]);

  // 初始化對話歷史和載入歷史訊息
  useEffect(() => {
    const initializeChat = async () => {
      const currentProject = getCurrentBasePath();
      if (currentProject) {
        // 檢查是否為新視窗或頁面重新整理
        const isPageRefresh = sessionStorage.getItem('pageRefreshed') === 'true';
        const isNewWindow = sessionStorage.getItem('isNewWindow') === 'true';
        const windowId = sessionStorage.getItem('windowId');
        
        console.log('[ChatPanel] Initialize - isPageRefresh:', isPageRefresh, 'isNewWindow:', isNewWindow, 'windowId:', windowId);
        
        if (isPageRefresh || isNewWindow) {
          // 頁面重新整理或新視窗時清除對話歷史
          console.log('[ChatPanel] New session - clearing conversation history');
          await claudeCodeService.clearSession(currentProject);
          setMessages([]);
          sessionStorage.removeItem('pageRefreshed');
          sessionStorage.removeItem('isNewWindow');
        } else {
          // 載入現有對話歷史（同一視窗內的 ChatPanel 重新掛載）
          console.log('[ChatPanel] Loading existing conversation history for same window');
          const history = await claudeCodeService.getMessageHistory(currentProject);
          console.log('[ChatPanel] Loaded history:', history.length, 'messages');
          setMessages(history);
        }
      }
    };
    
    initializeChat();
  }, [getCurrentBasePath]);

  // 檢查認證狀態
  useEffect(() => {
    const checkAuth = async () => {
      const authStatus = await claudeCodeService.checkAuthentication();
      setIsAuthenticated(authStatus);
    };
    checkAuth();
  }, []);

  // 監聽專案切換事件，清空對話內容
  useEffect(() => {
    const handleProjectChange = () => {
      setMessages([]);
      setCurrentAssistantMessage('');
      setIsStreaming(false);
      setIsThinking(false);
      setToolActivities(new Map());
      setCurrentAssistantMessageId('');
    };

    window.addEventListener('projectChange', handleProjectChange);
    
    return () => {
      window.removeEventListener('projectChange', handleProjectChange);
    };
  }, []);

  const handleSendMessage = async () => {
    if (!inputValue.trim() && attachments.length === 0) return;
    if (!isAuthenticated) {
      message.error(t('chat.auth.error'));
      return;
    }

    const newMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: inputValue.trim() || `[${t('chat.input.attachment')}]`,
      timestamp: new Date(),
      status: 'sending',
      attachments: [...attachments]
    };

    const messageContent = inputValue.trim();
    const messageAttachments = [...fileInputRef.current];
    
    // 建立完整的對話歷史（包含新訊息）
    const updatedMessages = [...messages, newMessage];
    
    setMessages(updatedMessages);
    setInputValue('');
    setAttachments([]);
    fileInputRef.current = [];
    setIsLoading(true);
    setIsStreaming(true);
    setIsThinking(true);

    // 準備接收助理回應
    const assistantMessageId = uuidv4();
    setCurrentAssistantMessage('');
    setCurrentAssistantMessageId(assistantMessageId);

    try {
      const currentProject = getCurrentBasePath();
      
      if (!currentProject) {
        throw new Error(t('chat.error.project'));
      }

      // 標記用戶訊息為已發送
      setMessages(prev => 
        prev.map(msg => 
          msg.id === newMessage.id ? { ...msg, status: 'sent' as const } : msg
        )
      );

      // 使用 SSE 發送訊息
      await claudeCodeService.sendMessageWithSSE(
        {
          content: messageContent,
          attachments: messageAttachments,
          projectPath: currentProject
          // 不需要傳送對話歷史，Claude SDK 會自動管理
        },
        (event: StreamEvent) => {
          console.log('SSE Event:', event);

          switch (event.type) {
            case 'start':
              console.log('Query started:', event.data.message);
              // 保持思考動畫，直到收到實際文字回覆
              break;

            case 'message':
              const sdkMessage = event.data.data as SDKMessage;
              handleSDKMessage(sdkMessage, assistantMessageId);
              break;

            case 'complete':
              console.log('Query completed');
              setIsStreaming(false);
              setIsThinking(false);
              // 如果有累積的訊息內容，建立最終訊息
              if (currentAssistantMessage.trim()) {
                const finalMessage: Message = {
                  id: assistantMessageId,
                  role: 'assistant',
                  content: currentAssistantMessage,
                  timestamp: new Date(),
                  status: 'sent'
                };
                setMessages(prev => [...prev, finalMessage]);
                setCurrentAssistantMessage('');
              }
              break;

            case 'error':
              console.error('Query error:', event.data);
              setIsStreaming(false);
              setIsThinking(false);
              
              // 改善錯誤處理，避免顯示空物件
              let errorMsg = t('chat.error.unknown');
              if (event.data?.error) {
                errorMsg = typeof event.data.error === 'string' ? event.data.error : t('chat.error.unknown');
              }
              
              // 如果是取消錯誤，不顯示錯誤訊息
              if (errorMsg.includes('cancelled') || errorMsg.includes('aborted')) {
                console.log('Request was cancelled');
                return;
              }
              
              message.error(t('chat.error.query') + ': ' + errorMsg);
              break;
          }
        }
      );

    } catch (error) {
      console.error('Send message error:', error);
      setIsStreaming(false);
      setIsThinking(false);
      setMessages(prev => 
        prev.map(msg => 
          msg.id === newMessage.id ? { ...msg, status: 'error' as const } : msg
        )
      );
      message.error(error instanceof Error ? error.message : t('chat.error.send'));
    } finally {
      setIsLoading(false);
    }
  };

  // 處理取消訊息發送
  const handleCancelMessage = () => {
    claudeCodeService.cancelCurrentRequest();
    
    // 如果有正在進行的助手訊息，將其標記為已取消
    if (currentAssistantMessageId && (currentAssistantMessage.trim() || isThinking)) {
      const cancelledMessage: Message = {
        id: currentAssistantMessageId,
        role: 'assistant',
        content: currentAssistantMessage.trim() || '',
        timestamp: new Date(),
        status: 'sent',
        isCancelled: true
      };
      
      setMessages(prev => [...prev, cancelledMessage]);
      
      // 添加系統取消訊息
      const systemCancelMessage: Message = {
        id: uuidv4(),
        role: 'system',
        content: t('chat.status.cancelledByUser', 'Cancelled by user'),
        timestamp: new Date(),
        status: 'sent'
      };
      
      setMessages(prev => [...prev, systemCancelMessage]);
    } else {
      // 如果沒有正在進行的消息，只顯示取消通知
      message.info(t('chat.status.cancelled', '已取消請求'));
    }
    
    // 重置所有狀態
    setIsLoading(false);
    setIsStreaming(false);
    setIsThinking(false);
    setCurrentAssistantMessage('');
    setCurrentAssistantMessageId('');
    setToolActivities(new Map());
  };

  // 處理 SDK 訊息
  const handleSDKMessage = (sdkMessage: SDKMessage, assistantMessageId: string) => {
    switch (sdkMessage.type) {
      case 'assistant':
        // 處理工具使用
        if (sdkMessage.message.content && Array.isArray(sdkMessage.message.content)) {
          for (const contentItem of sdkMessage.message.content) {
            if (typeof contentItem === 'object' && contentItem.type === 'tool_use') {
              // 添加新的工具活動
              const newActivity: ToolActivity = {
                toolName: contentItem.name,
                toolInput: contentItem.input,
                status: 'running',
                timestamp: new Date()
              };
              
              setToolActivities(prev => {
                const current = prev.get(assistantMessageId) || [];
                const updated = new Map(prev);
                updated.set(assistantMessageId, [...current, newActivity]);
                return updated;
              });
            } else if (typeof contentItem === 'object' && contentItem.type === 'text') {
              // 處理文字內容 - 當收到文字內容時停止思考動畫
              if (contentItem.text) {
                setIsThinking(false);
                setCurrentAssistantMessage(prev => prev + contentItem.text);
              }
            }
          }
        } else if (typeof sdkMessage.message.content === 'string') {
          // 當收到文字內容時停止思考動畫
          setIsThinking(false);
          setCurrentAssistantMessage(prev => prev + sdkMessage.message.content);
        }
        break;
        
      case 'user':
        // 更新工具狀態為已完成
        if (sdkMessage.message.content && Array.isArray(sdkMessage.message.content)) {
          for (const contentItem of sdkMessage.message.content) {
            if (typeof contentItem === 'object' && contentItem.type === 'tool_result') {
              setToolActivities(prev => {
                const current = prev.get(assistantMessageId) || [];
                const updated = new Map(prev);
                const newActivities = current.map(activity => {
                  // 找到對應的工具活動並更新狀態
                  if (activity.status === 'running') {
                    return { ...activity, status: 'completed' as const };
                  }
                  return activity;
                });
                updated.set(assistantMessageId, newActivities);
                return updated;
              });
            }
          }
        }
        break;
        
      case 'result':
        if (sdkMessage.subtype === 'success') {
          const finalMessage: Message = {
            id: assistantMessageId,
            role: 'assistant',
            content: sdkMessage.result,
            timestamp: new Date(),
            status: 'sent'
          };
          setMessages(prev => [...prev, finalMessage]);
          setCurrentAssistantMessage('');
        } else {
          const errorMessage: Message = {
            id: uuidv4(),
            role: 'system',
            content: `${t('chat.error.execution')} ${sdkMessage.subtype}`,
            timestamp: new Date(),
            status: 'error'
          };
          setMessages(prev => [...prev, errorMessage]);
          
          // 將進行中的工具活動標記為錯誤
          setToolActivities(prev => {
            const current = prev.get(assistantMessageId) || [];
            const updated = new Map(prev);
            const newActivities = current.map(activity => {
              if (activity.status === 'running') {
                return { ...activity, status: 'error' as const };
              }
              return activity;
            });
            updated.set(assistantMessageId, newActivities);
            return updated;
          });
        }
        break;
        
      case 'system':
        console.log('System message:', sdkMessage);
        break;
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
    padding: '16px',
    backgroundColor: darkMode ? '#1a1a1a' : '#fafafa',
    fontFamily: 'Monaco, Consolas, "Courier New", monospace',
    fontSize: '14px'
  };

  const inputAreaStyle = {
    padding: '16px',
    borderTop: darkMode ? '1px solid #303030' : '1px solid #f0f0f0',
    backgroundColor: darkMode ? '#141414' : '#fafafa'
  };

  if (isAuthenticated === null) {
    return (
      <div style={panelStyle}>
        <div style={{ ...headerStyle, textAlign: 'center' }}>
          <Spin size="small" /> {t('chat.status.checking')}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={panelStyle}>
        <div style={headerStyle}>
          <span style={{ color: darkMode ? '#ff4d4f' : '#ff4d4f', fontSize: '14px' }}>
            ⚠ {t('chat.auth.required')}
          </span>
        </div>
        <div style={{ ...messagesStyle, textAlign: 'center', color: darkMode ? '#999' : '#666' }}>
          <p>{t('chat.auth.instruction')}</p>
          <code style={{ 
            backgroundColor: darkMode ? '#262626' : '#f5f5f5',
            padding: '4px 8px',
            borderRadius: '4px'
          }}>
            claude login
          </code>
        </div>
      </div>
    );
  }

  return (
    <div style={panelStyle} className={className}>
      {/* Header */}
      <div style={headerStyle}>
        <Space>
          <RobotOutlined style={{ color: darkMode ? '#52c41a' : '#52c41a' }} />
          <span style={{ fontWeight: 500, color: darkMode ? '#fff' : '#000' }}>
            Claude Code
          </span>
          <span
            style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isAuthenticated ? '#52c41a' : '#ff4d4f', // 綠色表示已連接，紅色表示未連接
              cursor: 'pointer'
            }}
            title={isAuthenticated 
              ? (isStreaming ? t('chat.status.processing') : t('chat.status.ready'))
              : t('chat.auth.required')
            }
          />
        </Space>
      </div>

      {/* Messages Area */}
      <div style={messagesStyle}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              toolActivities={toolActivities.get(message.id)}
              darkMode={darkMode}
            />
          ))}

          {/* 顯示 AI 思考動畫 */}
          {isThinking && (
            <MessageBubble
              message={{
                id: 'thinking',
                role: 'assistant',
                content: '...',
                timestamp: new Date(),
                status: 'sending'
              }}
              darkMode={darkMode}
              isStreaming={true}
            />
          )}

          {/* 顯示正在串流的助理訊息 */}
          {isStreaming && currentAssistantMessage && !isThinking && (
            <MessageBubble
              message={{
                id: currentAssistantMessageId,
                role: 'assistant',
                content: currentAssistantMessage,
                timestamp: new Date(),
                status: 'sending'
              }}
              toolActivities={toolActivities.get(currentAssistantMessageId)}
              darkMode={darkMode}
              isStreaming={true}
            />
          )}
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
            placeholder={t('chat.input.placeholder')}
            autoSize={{ minRows: 1, maxRows: 4 }}
            style={{ 
              flex: 1,
              minHeight: '32px', // 設定最小高度防止閃動
              backgroundColor: darkMode ? '#1f1f1f' : '#fff',
              borderColor: darkMode ? '#303030' : '#d9d9d9',
              color: darkMode ? '#fff' : '#000',
              resize: 'none' // 禁止手動調整大小
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
                backgroundColor: darkMode ? '#262626' : '#f5f5f5',
                borderColor: darkMode ? '#303030' : '#d9d9d9',
                color: darkMode ? '#fff' : '#000'
              }}
            />
          </Upload>
          <Button 
            type="primary" 
            icon={isLoading ? <CloseOutlined /> : <SendOutlined />}
            onClick={isLoading ? handleCancelMessage : handleSendMessage}
            loading={false}
            disabled={!isLoading && (!inputValue.trim() && attachments.length === 0)}
            title={isLoading ? t('chat.action.cancel', '取消') : t('chat.action.send', '發送')}
          />
        </Space.Compact>
      </div>
    </div>
  );
};

export default ChatPanel;