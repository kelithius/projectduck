"use client";

import React, { ErrorInfo } from "react";
import { ErrorBoundary } from "./ErrorBoundary";
import { Result, Button, Space, Alert, Typography } from "antd";
import {
  ReloadOutlined,
  ApiOutlined,
  WarningOutlined,
} from "@ant-design/icons";

const { Paragraph } = Typography;

interface ClaudeErrorBoundaryProps {
  children: React.ReactNode;
  onRetry?: () => void;
}

export const ClaudeErrorBoundary: React.FC<ClaudeErrorBoundaryProps> = ({
  children,
  onRetry,
}) => {
  const handleClaudeError = (error: Error, errorInfo: ErrorInfo) => {
    // Claude Code specific error handling
    console.error("[ClaudeErrorBoundary] Claude Code error:", {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      context: "Claude Code Integration",
    });

    // Can send Claude-specific errors to monitoring service here
    if (typeof window !== "undefined") {
      // Check if this is a Claude Code related error
      const isClaudeCodeError =
        error.message.includes("Claude") ||
        error.message.includes("SSE") ||
        error.message.includes("stream") ||
        error.stack?.includes("claudeCodeService");

      if (isClaudeCodeError) {
        console.group("🤖 Claude Code Error Details");
        console.error("This appears to be a Claude Code integration error");
        console.error("Consider checking:");
        console.error("- Claude Code authentication status");
        console.error("- Network connectivity");
        console.error("- SSE stream configuration");
        console.error("- API endpoint availability");
        console.groupEnd();
      }
    }
  };

  const claudeErrorFallback = (
    <div
      style={{
        padding: "24px",
        textAlign: "center",
        minHeight: "300px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ maxWidth: "500px" }}>
        <Result
          status="error"
          icon={<ApiOutlined style={{ color: "#ff4d4f" }} />}
          title="Claude Code 發生錯誤"
          subTitle="Claude Code 整合遇到問題，但其他功能仍可正常使用。"
          extra={
            <Space direction="vertical" style={{ width: "100%" }}>
              <Alert
                message="建議的解決步驟"
                description={
                  <ul style={{ textAlign: "left", paddingLeft: "20px" }}>
                    <li>檢查網路連線狀態</li>
                    <li>重新驗證 Claude Code 身份</li>
                    <li>嘗試重新載入頁面</li>
                    <li>如問題持續，請聯繫技術支援</li>
                  </ul>
                }
                type="info"
                showIcon
                icon={<WarningOutlined />}
                style={{ textAlign: "left" }}
              />

              <Space wrap>
                {onRetry && (
                  <Button
                    type="primary"
                    icon={<ReloadOutlined />}
                    onClick={onRetry}
                  >
                    重試 Claude Code
                  </Button>
                )}
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => window.location.reload()}
                >
                  重新載入頁面
                </Button>
              </Space>

              <Paragraph
                type="secondary"
                style={{ fontSize: "12px", marginTop: "16px" }}
              >
                檔案瀏覽和內容查看功能仍可正常使用。 只有 Claude Code AI
                助手功能暫時不可用。
              </Paragraph>
            </Space>
          }
        />
      </div>
    </div>
  );

  return (
    <ErrorBoundary fallback={claudeErrorFallback} onError={handleClaudeError}>
      {children}
    </ErrorBoundary>
  );
};
