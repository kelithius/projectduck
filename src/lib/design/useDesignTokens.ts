import { useMemo } from 'react';
import { useTheme } from '../providers/theme-provider';
import { lightTokens, darkTokens, semanticColors, DesignTokens } from './designTokens';

export interface ThemedDesignTokens extends DesignTokens {
  semantic: typeof semanticColors;
}

/**
 * 設計代碼 Hook - 提供基於當前主題的設計代碼
 * 
 * @returns 當前主題的設計代碼和語義顏色
 * 
 * @example
 * ```typescript
 * const tokens = useDesignTokens();
 * 
 * const styles = {
 *   backgroundColor: tokens.colors.background.primary,
 *   border: `1px solid ${tokens.colors.border.primary}`,
 *   padding: tokens.spacing.md,
 *   borderRadius: tokens.borderRadius.md
 * };
 * ```
 */
export const useDesignTokens = (): ThemedDesignTokens => {
  const { isDark } = useTheme();
  
  return useMemo(() => ({
    ...(isDark ? darkTokens : lightTokens),
    semantic: semanticColors,
  }), [isDark]);
};

/**
 * 快速樣式生成工具 - 提供常用樣式組合
 */
export const useStyleUtils = () => {
  const tokens = useDesignTokens();
  
  return useMemo(() => ({
    // 卡片樣式
    card: {
      backgroundColor: tokens.colors.background.primary,
      border: `1px solid ${tokens.colors.border.primary}`,
      borderRadius: tokens.borderRadius.md,
      boxShadow: tokens.shadows.sm,
      transition: tokens.transitions.normal,
    },
    
    // 分隔線樣式
    divider: {
      borderColor: tokens.colors.border.primary,
    },
    
    // 面板容器樣式
    panel: {
      backgroundColor: tokens.colors.background.primary,
      borderRight: `1px solid ${tokens.colors.border.primary}`,
    },
    
    // Header 樣式
    header: {
      backgroundColor: tokens.semantic.header.background.light, // 特殊處理
      borderBottom: `1px solid ${tokens.colors.border.primary}`,
    },
    
    // 側邊欄樣式
    sidebar: {
      backgroundColor: tokens.colors.background.secondary,
      borderRight: `1px solid ${tokens.colors.border.primary}`,
    },
    
    // 拖拽把手樣式
    dragHandle: {
      backgroundColor: tokens.semantic.dragHandle.background.light, // 需要主題感知
      cursor: 'col-resize',
      transition: tokens.transitions.fast,
      '&:hover': {
        backgroundColor: tokens.colors.border.hover,
      }
    },
    
    // 懸停效果
    hover: {
      transition: tokens.transitions.fast,
      '&:hover': {
        backgroundColor: tokens.colors.interactive.hover,
      }
    },
    
    // 文字樣式
    text: {
      primary: { color: tokens.colors.text.primary },
      secondary: { color: tokens.colors.text.secondary },
      disabled: { color: tokens.colors.text.disabled },
    },
    
  }), [tokens]);
};

/**
 * 主題感知樣式生成器 - 自動處理深色/淺色主題差異
 */
export const useThemedStyles = () => {
  const { isDark } = useTheme();
  const tokens = useDesignTokens();
  
  return useMemo(() => ({
    // 項目狀態背景色
    projectItemBg: (active: boolean, hover: boolean) => {
      if (active) {
        return isDark 
          ? tokens.semantic.project.activeBg.dark 
          : tokens.semantic.project.activeBg.light;
      }
      if (hover) {
        return isDark 
          ? tokens.semantic.project.hoverBg.dark 
          : tokens.semantic.project.hoverBg.light;
      }
      return 'transparent'; // 預設背景透明
    },
    
    // 錯誤狀態樣式
    errorState: {
      backgroundColor: isDark 
        ? tokens.semantic.error.background.dark 
        : tokens.semantic.error.background.light,
      borderColor: isDark 
        ? tokens.semantic.error.border.dark 
        : tokens.semantic.error.border.light,
    },
    
    // Header 背景（特殊處理）
    headerBg: isDark 
      ? tokens.semantic.header.background.dark 
      : tokens.semantic.header.background.light,
    
    // 拖拽把手背景
    dragHandleBg: isDark 
      ? tokens.semantic.dragHandle.background.dark 
      : tokens.semantic.dragHandle.background.light,
    
  }), [isDark, tokens]);
};