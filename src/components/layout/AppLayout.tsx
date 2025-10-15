"use client";

import React, {
  useState,
  useEffect,
  Suspense,
  useCallback,
  useRef,
} from "react";
import { Layout, Typography, Spin, Space, App, Button } from "antd";
import { MoonOutlined, MessageOutlined, SunOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import "allotment/dist/style.css";
import { FileTree } from "@/components/fileTree/FileTree";
import { ProjectSidebar } from "@/components/project/ProjectSidebar";
import { FileItem } from "@/lib/types";
import apiService from "@/lib/services/api";
import { ThemeProvider, useTheme } from "@/lib/providers/theme-provider";
import { ProjectProvider } from "@/lib/providers/project-provider";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { ClaudeErrorBoundary } from "@/components/common/ClaudeErrorBoundary";
import {
  useDesignTokens,
  useStyleUtils,
  useThemedStyles,
} from "@/lib/design/useDesignTokens";
import { appConfig } from "@/lib/services/appConfigService";

const ContentViewer = React.lazy(() =>
  import("@/components/contentViewer/ContentViewer").then((module) => ({
    default: module.ContentViewer,
  })),
);

const ChatPanel = React.lazy(() =>
  import("@/components/chat/ChatPanel").then((module) => ({
    default: module.ChatPanel,
  })),
);

const { Header, Content } = Layout;
const { Title } = Typography;

const AppLayoutInner: React.FC = () => {
  const { message } = App.useApp();
  const { t } = useTranslation();
  const { isDark, toggleTheme } = useTheme();
  const tokens = useDesignTokens();
  const styles = useStyleUtils();
  const themedStyles = useThemedStyles();

  // Check if Claude Code feature is enabled
  const isClaudeCodeEnabled = appConfig.isClaudeCodeEnabled();

  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [projectSidebarVisible, setProjectSidebarVisible] = useState(false);
  const [chatPanelVisible, setChatPanelVisible] = useState(false);
  const [chatPanelWidth, setChatPanelWidth] = useState(350); // Default width
  const [fileTreeWidth, setFileTreeWidth] = useState(260); // FileTree default width
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingFileTree, setIsDraggingFileTree] = useState(false);

  // Design system styles
  const headerStyle = {
    backgroundColor: themedStyles.headerBg,
    padding: `0 ${tokens.spacing.lg}`,
    borderBottom: `1px solid ${tokens.colors.border.primary}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  };

  const contentStyle = {
    backgroundColor: tokens.colors.background.secondary,
    overflow: "hidden" as const,
  };

  const sidebarStyle = {
    height: "100%",
    ...styles.sidebar,
    overflow: "auto",
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Generate unique ID for each new window/tab
      let windowId = sessionStorage.getItem("windowId");
      if (!windowId) {
        windowId = `window_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem("windowId", windowId);
        sessionStorage.setItem("isNewWindow", "true");
        console.log("[AppLayout] New window detected, assigned ID:", windowId);
      }

      // Check if this is a page refresh
      const navigation = performance.getEntriesByType(
        "navigation",
      )[0] as PerformanceNavigationTiming;
      if (navigation && navigation.type === "reload") {
        sessionStorage.setItem("pageRefreshed", "true");
        console.log(
          "[AppLayout] Page was refreshed, marking for session clear",
        );
      } else {
        console.log("[AppLayout] Normal navigation, windowId:", windowId);
      }
    }

    setMounted(true);
    let isCancelled = false;

    const checkConnection = async () => {
      try {
        await apiService.healthCheck();
        if (!isCancelled) {
          setLoading(false);
        }
      } catch {
        if (!isCancelled) {
          message.error(t("fileTree.loadingError"));
          setLoading(false);
        }
      }
    };

    checkConnection();

    return () => {
      isCancelled = true;
    };
  }, [message, t]);

  // Cleanup drag-related resources
  useEffect(() => {
    return () => {
      // Cancel all unfinished RAF
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      if (rafIdChatRef.current) {
        cancelAnimationFrame(rafIdChatRef.current);
      }

      // Reset drag states
      isDraggingRef.current = false;
      isDraggingFileTreeRef.current = false;
    };
  }, []);

  const handleFileSelect = (file: FileItem | null) => {
    setSelectedFile(file);

    // Notify Claude Code and internal components about the currently selected file
    if (file && typeof window !== "undefined") {
      try {
        const fileSelectionMessage = {
          type: "fileSelected",
          file: {
            name: file.name,
            path: file.path,
            type: file.type,
            extension: file.extension,
          },
        };

        // Notify Claude Code (if in iframe)
        window.parent?.postMessage(fileSelectionMessage, "*");

        // Notify components in the same window (ChatPanel)
        window.postMessage(fileSelectionMessage, "*");

        console.log("[AppLayout] Notified file selection:", file.path);
      } catch (error) {
        console.log("[AppLayout] Failed to notify file selection:", error);
      }
    }
  };

  const toggleProjectSidebar = () => {
    setProjectSidebarVisible(!projectSidebarVisible);
  };

  const toggleChatPanel = () => {
    setChatPanelVisible(!chatPanelVisible);
  };

  // ChatPanel drag handling logic - optimized version
  const isDraggingRef = useRef(false);
  const rafIdChatRef = useRef<number>();

  const handleChatPanelMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      isDraggingRef.current = true;

      const startX = e.clientX;
      const startWidth = chatPanelWidth;

      const handleMouseMove = (e: MouseEvent) => {
        if (!isDraggingRef.current) return;

        // Calculate new width: Chat Panel drags from right side, so reverse calculation
        const deltaX = startX - e.clientX; // Note: reverse calculation
        const newWidth = startWidth + deltaX;
        const minWidth = 300;
        const maxWidth = Math.min(800, window.innerWidth - 400);
        const clampedWidth = Math.min(Math.max(newWidth, minWidth), maxWidth);

        // Use RAF throttle to reduce state update frequency
        if (rafIdChatRef.current) {
          cancelAnimationFrame(rafIdChatRef.current);
        }

        rafIdChatRef.current = requestAnimationFrame(() => {
          setChatPanelWidth(clampedWidth);
          rafIdChatRef.current = undefined; // Ensure cleanup
        });
      };

      const handleMouseUp = () => {
        isDraggingRef.current = false;
        setIsDragging(false);

        if (rafIdChatRef.current) {
          cancelAnimationFrame(rafIdChatRef.current);
          rafIdChatRef.current = undefined;
        }

        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [chatPanelWidth],
  );

  // Use ref to track drag state, avoid re-rendering on every mousemove
  const isDraggingFileTreeRef = useRef(false);
  const rafIdRef = useRef<number>();

  // FileTree drag handling logic - fixed version
  const handleFileTreeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDraggingFileTree(true);
      isDraggingFileTreeRef.current = true;

      const startX = e.clientX;
      const startWidth = fileTreeWidth;

      const handleMouseMove = (e: MouseEvent) => {
        if (!isDraggingFileTreeRef.current) return;

        // Calculate new width: start width + mouse movement distance
        const deltaX = e.clientX - startX;
        const newWidth = startWidth + deltaX;
        const minWidth = 200;
        const maxWidth = Math.min(500, window.innerWidth - 600);
        const clampedWidth = Math.min(Math.max(newWidth, minWidth), maxWidth);

        // Use RAF throttle to reduce state update frequency
        if (rafIdRef.current) {
          cancelAnimationFrame(rafIdRef.current);
        }

        rafIdRef.current = requestAnimationFrame(() => {
          setFileTreeWidth(clampedWidth);
          rafIdRef.current = undefined; // Ensure cleanup
        });
      };

      const handleMouseUp = () => {
        isDraggingFileTreeRef.current = false;
        setIsDraggingFileTree(false);

        if (rafIdRef.current) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = undefined;
        }

        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [fileTreeWidth],
  );

  if (!mounted) {
    return (
      <Layout style={{ height: "100vh" }}>
        <Content
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div></div>
        </Content>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout style={{ height: "100vh" }}>
        <Content
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Spin size="large" />
        </Content>
      </Layout>
    );
  }

  return (
    <Layout style={{ height: "100vh" }}>
      <Header style={headerStyle}>
        <Space align="center" size="middle" style={{ alignItems: "center" }}>
          <Button
            type="text"
            onClick={toggleProjectSidebar}
            style={{
              color: isDark ? "#b8b8b8" : "#666666",
              borderRadius: "6px",
              padding: "4px 8px",
              height: "auto",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
            aria-label="Toggle project sidebar"
          >
            <svg
              width="12"
              height="14"
              viewBox="0 0 12 14"
              fill="none"
              style={{ display: "block" }}
            >
              <rect x="0" y="0" width="12" height="2.5" fill="currentColor" />
              <rect x="0" y="5.5" width="12" height="2.5" fill="currentColor" />
              <rect x="0" y="11" width="12" height="2.5" fill="currentColor" />
            </svg>
            {/* TODO: Replace with next/image for better performance */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/AppIcon.png"
              alt="ProjectDuck Icon"
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                display: "block",
              }}
            />
          </Button>
          <Title
            level={3}
            style={{
              margin: 0,
              lineHeight: "32px",
              color: isDark ? "#fff" : "#1890ff",
            }}
          >
            {t("title")}
          </Title>
        </Space>

        <Space align="center">
          {isClaudeCodeEnabled && (
            <Button
              type="text"
              icon={<MessageOutlined />}
              onClick={toggleChatPanel}
              style={{
                color: chatPanelVisible
                  ? "#1890ff"
                  : isDark
                    ? "#b8b8b8"
                    : "#666666",
              }}
              aria-label="Toggle chat panel"
            />
          )}
          <Button
            type="text"
            icon={isDark ? <SunOutlined /> : <MoonOutlined />}
            onClick={toggleTheme}
            style={{
              color: isDark ? "#fadb14" : "#1890ff",
              fontSize: "16px",
              border: "none",
              boxShadow: "none",
            }}
            aria-label={
              isDark ? t("theme.switchToLight") : t("theme.switchToDark")
            }
          />
        </Space>
      </Header>

      <Content style={contentStyle}>
        <div style={{ display: "flex", height: "100%" }}>
          {/* Left Pane: File Tree - Resizable Width */}
          <div
            style={{
              width: `${fileTreeWidth}px`,
              minWidth: `${fileTreeWidth}px`,
              maxWidth: `${fileTreeWidth}px`,
              ...sidebarStyle,
              display: "flex",
            }}
          >
            {/* FileTree content */}
            <div
              style={{
                flex: 1,
                borderRight: `1px solid ${isDark ? "#303030" : "#f0f0f0"}`,
                overflow: "hidden",
              }}
            >
              <ErrorBoundary>
                <FileTree
                  onFileSelect={handleFileSelect}
                  selectedFile={selectedFile}
                  darkMode={isDark}
                />
              </ErrorBoundary>
            </div>

            {/* Drag handle */}
            <div
              style={{
                width: "4px",
                height: "100%",
                backgroundColor: "transparent",
                cursor: "col-resize",
                position: "relative",
                zIndex: 999,
              }}
              onMouseDown={handleFileTreeMouseDown}
            >
              {/* Visible drag indicator */}
              <div
                style={{
                  position: "absolute",
                  right: "1px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: "2px",
                  height: "40px",
                  backgroundColor: themedStyles.dragHandleBg,
                  borderRadius: tokens.borderRadius.sm,
                  opacity: isDraggingFileTree ? 1 : 0.3,
                  transition: tokens.transitions.fast,
                }}
              />
            </div>
          </div>

          {/* Middle and Right Panes: Content and Chat Panel */}
          <div
            style={{
              flex: 1,
              display: "flex",
              overflow: "hidden",
            }}
          >
            {/* Content Viewer - Flexible width */}
            <div
              style={{
                flex: 1,
                height: "100%",
                overflow: "hidden",
              }}
            >
              <ErrorBoundary>
                <Suspense
                  fallback={
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        height: "100%",
                      }}
                    >
                      <Spin size="large" />
                    </div>
                  }
                >
                  <ContentViewer
                    selectedFile={selectedFile}
                    darkMode={isDark}
                  />
                </Suspense>
              </ErrorBoundary>
            </div>

            {/* Chat Panel - Only rendered when Claude Code is enabled */}
            {isClaudeCodeEnabled && (
              <div
                style={{
                  width: chatPanelVisible ? `${chatPanelWidth}px` : "0px",
                  minWidth: chatPanelVisible ? `${chatPanelWidth}px` : "0px",
                  maxWidth: chatPanelVisible ? `${chatPanelWidth}px` : "0px",
                  height: "100%",
                  overflow: "hidden",
                  transition: isDragging
                    ? "none"
                    : `width ${tokens.transitions.normal}, min-width ${tokens.transitions.normal}, max-width ${tokens.transitions.normal}`,
                  display: "flex",
                  backgroundColor: tokens.colors.background.primary,
                  borderLeft: chatPanelVisible
                    ? `1px solid ${tokens.colors.border.primary}`
                    : "none",
                }}
              >
                {/* Drag handle - only shown when visible */}
                {chatPanelVisible && (
                  <div
                    style={{
                      width: "4px",
                      height: "100%",
                      backgroundColor: "transparent",
                      cursor: "col-resize",
                      position: "relative",
                    }}
                    onMouseDown={handleChatPanelMouseDown}
                  >
                    {/* Visible drag indicator */}
                    <div
                      style={{
                        position: "absolute",
                        left: "1px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        width: "2px",
                        height: "40px",
                        backgroundColor: themedStyles.dragHandleBg,
                        borderRadius: tokens.borderRadius.sm,
                        opacity: isDragging ? 1 : 0.3,
                        transition: tokens.transitions.fast,
                      }}
                    />
                  </div>
                )}

                {/* ChatPanel content - always rendered to maintain state */}
                <div
                  style={{
                    flex: 1,
                    overflow: "hidden",
                    display: chatPanelVisible ? "block" : "none", // Use display to control visibility instead of conditional rendering
                  }}
                >
                  <ClaudeErrorBoundary onRetry={() => window.location.reload()}>
                    <Suspense
                      fallback={
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            height: "100%",
                            backgroundColor: tokens.colors.background.primary,
                          }}
                        >
                          <Spin size="large" />
                        </div>
                      }
                    >
                      <ChatPanel darkMode={isDark} />
                    </Suspense>
                  </ClaudeErrorBoundary>
                </div>
              </div>
            )}
          </div>
        </div>
      </Content>

      <ProjectSidebar
        visible={projectSidebarVisible}
        onClose={() => setProjectSidebarVisible(false)}
        isDark={isDark}
      />
    </Layout>
  );
};

export const AppLayout: React.FC = () => {
  return (
    <ThemeProvider>
      <ProjectProvider>
        <AppLayoutInner />
      </ProjectProvider>
    </ThemeProvider>
  );
};
