"use client";

import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  tomorrow,
  prism,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import { useTranslation } from "react-i18next";
import { Message } from "@/lib/types/chat";

export interface ToolActivity {
  toolName: string;
  toolInput?: unknown;
  status: "running" | "completed" | "error";
  timestamp: Date;
}

interface MessageBubbleProps {
  message: Message;
  toolActivities?: ToolActivity[];
  isStreaming?: boolean;
  darkMode?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  toolActivities = [],
  isStreaming = false,
  darkMode = false,
}) => {
  const { t } = useTranslation();
  const [expandedTools, setExpandedTools] = useState<Set<number>>(new Set());
  const [typingText, setTypingText] = useState(t("chat.status.typing"));

  const isAssistant = message.role === "assistant" || message.role === "system";
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  const toggleToolExpansion = (index: number) => {
    const newExpanded = new Set(expandedTools);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedTools(newExpanded);
  };

  // 打字動畫效果
  useEffect(() => {
    if (message.content === "..." && isAssistant && isStreaming) {
      const baseText = t("chat.status.typing");
      const states = [
        baseText,
        `${baseText}.`,
        `${baseText}..`,
        `${baseText}...`,
      ];
      let currentIndex = 0;

      const interval = setInterval(() => {
        setTypingText(states[currentIndex]);
        currentIndex = (currentIndex + 1) % states.length;
      }, 500); // 每500毫秒切換一次

      return () => clearInterval(interval);
    }
  }, [message.content, isAssistant, isStreaming, t]);

  // 判斷內容是否為 Markdown
  const isMarkdown = (content: string): boolean => {
    // 簡單的 Markdown 檢測邏輯
    const markdownPatterns = [
      /^#{1,6}\s/m, // 標題
      /\*\*.*?\*\*/, // 粗體
      /\*.*?\*/, // 斜體
      /```[\s\S]*?```/, // 程式碼區塊
      /`.*?`/, // 行內程式碼
      /^\s*[-*+]\s/m, // 清單
      /^\s*\d+\.\s/m, // 數字清單
      /\[.*?\]\(.*?\)/, // 連結
      /\|.*\|/, // 表格
    ];

    return markdownPatterns.some((pattern) => pattern.test(content));
  };

  const renderContent = () => {
    // 特殊處理思考動畫 - 顯示動態點點效果
    if (message.content === "..." && isAssistant && isStreaming) {
      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            height: "20px",
          }}
        >
          <div
            style={{
              fontSize: "14px",
              lineHeight: "1",
              color: darkMode ? "#888" : "#666",
              fontFamily: 'Monaco, Consolas, "Courier New", monospace',
            }}
          >
            {typingText}
          </div>
        </div>
      );
    }

    if (isUser || !isMarkdown(message.content)) {
      // 使用者訊息或非 Markdown 內容，直接顯示
      return <div style={{ whiteSpace: "pre-wrap" }}>{message.content}</div>;
    }

    // AI 訊息且為 Markdown，使用 ReactMarkdown 渲染
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          code: (props: any) => {
            const {
              node: _node,
              inline,
              className,
              children,
              ...restProps
            } = props;
            const match = /language-(\w+)/.exec(className || "");
            const language = match ? match[1] : "";

            if (!inline && language) {
              return (
                <SyntaxHighlighter
                  style={darkMode ? tomorrow : prism}
                  language={language}
                  PreTag="div"
                  customStyle={{
                    margin: "8px 0",
                    borderRadius: "6px",
                    fontSize: "13px",
                  }}
                  {...restProps}
                >
                  {String(children).replace(/\n$/, "")}
                </SyntaxHighlighter>
              );
            }

            return (
              <code
                className={className}
                style={{
                  backgroundColor: darkMode ? "#3a3a3a" : "#f0f0f0",
                  padding: "2px 4px",
                  borderRadius: "3px",
                  fontSize: "0.9em",
                }}
                {...restProps}
              >
                {children}
              </code>
            );
          },
          h1: ({ children }) => (
            <h1
              style={{
                borderBottom: `2px solid ${darkMode ? "#404040" : "#eaecef"}`,
                paddingBottom: "10px",
                marginTop: "24px",
                marginBottom: "16px",
                color: darkMode ? "#fff" : "#000",
              }}
            >
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2
              style={{
                borderBottom: `1px solid ${darkMode ? "#404040" : "#eaecef"}`,
                paddingBottom: "8px",
                marginTop: "24px",
                marginBottom: "16px",
                color: darkMode ? "#fff" : "#000",
              }}
            >
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3
              style={{
                marginTop: "24px",
                marginBottom: "16px",
                color: darkMode ? "#fff" : "#000",
              }}
            >
              {children}
            </h3>
          ),
          blockquote: ({ children }) => (
            <blockquote
              style={{
                padding: "0 1em",
                color: darkMode ? "#b3b3b3" : "#656d76",
                borderLeft: `4px solid ${darkMode ? "#404040" : "#d0d7de"}`,
                margin: "0 0 16px 0",
              }}
            >
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div style={{ overflowX: "auto", marginBottom: "16px" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  border: `1px solid ${darkMode ? "#404040" : "#d0d7de"}`,
                }}
              >
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th
              style={{
                padding: "6px 13px",
                border: `1px solid ${darkMode ? "#404040" : "#d0d7de"}`,
                backgroundColor: darkMode ? "#2d2d2d" : "#f6f8fa",
                color: darkMode ? "#fff" : "#000",
                fontWeight: 600,
              }}
            >
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td
              style={{
                padding: "6px 13px",
                border: `1px solid ${darkMode ? "#404040" : "#d0d7de"}`,
                color: darkMode ? "#e6e6e6" : "#000",
              }}
            >
              {children}
            </td>
          ),
          ul: ({ children }) => (
            <ul style={{ marginBottom: "16px", paddingLeft: "2em" }}>
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol style={{ marginBottom: "16px", paddingLeft: "2em" }}>
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li style={{ marginBottom: "4px" }}>{children}</li>
          ),
          p: ({ children }) => (
            <p style={{ margin: "8px 0", lineHeight: "1.6" }}>{children}</p>
          ),
          pre: ({ children }) => (
            <div style={{ marginBottom: "16px" }}>
              <pre
                style={{
                  backgroundColor: darkMode ? "#1e1e1e" : "#f6f8fa",
                  padding: "16px",
                  borderRadius: "6px",
                  overflow: "auto",
                  fontSize: "13px",
                  lineHeight: "1.5",
                  border: `1px solid ${darkMode ? "#404040" : "#d0d7de"}`,
                  margin: 0,
                }}
              >
                {children}
              </pre>
            </div>
          ),
        }}
      >
        {message.content}
      </ReactMarkdown>
    );
  };

  const renderToolActivities = () => {
    if (!toolActivities || !toolActivities.length) return null;

    return (
      <div
        style={{
          marginTop: "8px",
          padding: "8px",
          backgroundColor: darkMode ? "#1a1a1a" : "#f0f0f0",
          borderRadius: "8px",
          fontSize: "12px",
          opacity: 0.8,
        }}
      >
        {(toolActivities as ToolActivity[]).map(
          (activity: ToolActivity, index: number) => {
            const isExpanded: boolean = expandedTools.has(index);
            const hasDetails: boolean = Boolean(
              activity.toolInput &&
                typeof activity.toolInput === "object" &&
                activity.toolInput !== null &&
                Object.keys(activity.toolInput).length > 0,
            );

            // Extract file path for display
            const getFilePathSuffix = (): string => {
              if (
                activity.toolInput &&
                typeof activity.toolInput === "object" &&
                activity.toolInput !== null &&
                "file_path" in activity.toolInput &&
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                typeof (activity.toolInput as any).file_path === "string"
              ) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return ` → ${((activity.toolInput as any).file_path as string).split("/").pop()}`;
              }
              return "";
            };

            return (
              <div key={index} style={{ margin: "2px 0" }}>
                {/* Tool 標題行 */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    cursor: hasDetails ? "pointer" : "default",
                    padding: "2px 0",
                  }}
                  onClick={() => hasDetails && toggleToolExpansion(index)}
                >
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor:
                        activity.status === "running"
                          ? "#52c41a"
                          : activity.status === "completed"
                            ? "#1890ff"
                            : "#ff4d4f",
                      animation:
                        activity.status === "running"
                          ? "pulse 1.5s infinite"
                          : "none",
                    }}
                  />

                  {/* 展開/收合指示器 */}
                  {hasDetails && (
                    <span
                      style={{
                        color: darkMode ? "#999" : "#666",
                        fontSize: "10px",
                        transform: isExpanded
                          ? "rotate(90deg)"
                          : "rotate(0deg)",
                        transition: "transform 0.2s ease",
                      }}
                    >
                      ▶
                    </span>
                  )}

                  <span style={{ flex: 1 }}>
                    {activity.status === "running" && "🔧 "}
                    {activity.status === "completed" && "✅ "}
                    {activity.status === "error" && "❌ "}
                    {activity.toolName}
                    {getFilePathSuffix()}
                  </span>
                </div>

                {/* 展開的詳細內容 */}
                {isExpanded && hasDetails && (
                  <div
                    style={{
                      marginLeft: hasDetails ? "20px" : "14px",
                      marginTop: "4px",
                      padding: "6px 8px",
                      backgroundColor: darkMode ? "#2a2a2a" : "#e8e8e8",
                      borderRadius: "4px",
                      fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                      fontSize: "11px",
                      color: darkMode ? "#ccc" : "#555",
                    }}
                  >
                    <pre
                      style={{
                        margin: 0,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {JSON.stringify(activity.toolInput, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          },
        )}
      </div>
    );
  };

  // Terminal 風格設計
  return (
    <div
      style={{
        marginBottom: "16px", // 統一間距
        fontFamily: 'Monaco, Consolas, "Courier New", monospace',
        fontSize: "14px",
        lineHeight: "1.6",
      }}
    >
      {/* 使用者輸入 */}
      {isUser && (
        <div
          style={{
            display: "flex",
            marginBottom: "8px",
          }}
        >
          <span
            style={{
              color: darkMode ? "#52c41a" : "#52c41a",
              marginRight: "8px",
              fontWeight: "bold",
            }}
          >
            &gt;
          </span>
          <span
            style={{
              color: darkMode ? "#e6e6e6" : "#000",
              flex: 1,
            }}
          >
            {message.content}
          </span>
          {message.status === "error" && (
            <span style={{ color: "#ff4d4f", marginLeft: "8px" }}>⚠</span>
          )}
        </div>
      )}

      {/* 檔案上下文指示器 - 只對使用者訊息顯示 */}
      {isUser && message.currentFile && (
        <div
          style={{
            marginLeft: "24px", // 與使用者訊息對齊
            marginTop: "4px",
            marginBottom: "8px",
            padding: "4px 8px",
            backgroundColor: darkMode ? "#1a1a1a" : "#f0f8ff",
            borderLeft: `2px solid ${darkMode ? "#1890ff" : "#1890ff"}`,
            borderRadius: "0 4px 4px 0",
            fontSize: "11px",
            color: darkMode ? "#888" : "#666",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span style={{ color: darkMode ? "#1890ff" : "#1890ff" }}>📄</span>
          <span>
            <code
              style={{
                backgroundColor: darkMode ? "#2a2a2a" : "#e8e8e8",
                padding: "1px 4px",
                borderRadius: "2px",
                fontSize: "10px",
              }}
            >
              {message.currentFile.name}
            </code>
          </span>
        </div>
      )}

      {/* AI 回應 */}
      {isAssistant && (
        <div
          style={{
            marginLeft: "16px", // 縮排表示 AI 回應
            color: isSystem
              ? darkMode
                ? "#888"
                : "#666" // System message 用灰色
              : darkMode
                ? "#e6e6e6"
                : "#000", // 一般 AI 回應用正常顏色
          }}
        >
          {renderContent()}

          {/* 工具活動顯示 */}
          {renderToolActivities()}
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.1);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes typing-animation {
          0% {
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
          100% {
            opacity: 1;
          }
        }

        .typing-animation {
          animation: typing-animation 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default MessageBubble;
