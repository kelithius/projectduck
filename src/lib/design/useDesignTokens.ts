import { useMemo } from "react";
import { useTheme } from "../providers/theme-provider";
import {
  lightTokens,
  darkTokens,
  semanticColors,
  DesignTokens,
} from "./designTokens";

export interface ThemedDesignTokens extends DesignTokens {
  semantic: typeof semanticColors;
}

/**
 * Design Tokens Hook - Provides design tokens based on the current theme
 *
 * @returns Design tokens and semantic colors for the current theme
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

  return useMemo(
    () => ({
      ...(isDark ? darkTokens : lightTokens),
      semantic: semanticColors,
    }),
    [isDark],
  );
};

/**
 * Quick Style Utility - Provides common style combinations
 */
export const useStyleUtils = () => {
  const tokens = useDesignTokens();

  return useMemo(
    () => ({
      // Card styles
      card: {
        backgroundColor: tokens.colors.background.primary,
        border: `1px solid ${tokens.colors.border.primary}`,
        borderRadius: tokens.borderRadius.md,
        boxShadow: tokens.shadows.sm,
        transition: tokens.transitions.normal,
      },

      // Divider styles
      divider: {
        borderColor: tokens.colors.border.primary,
      },

      // Panel container styles
      panel: {
        backgroundColor: tokens.colors.background.primary,
        borderRight: `1px solid ${tokens.colors.border.primary}`,
      },

      // Header styles
      header: {
        backgroundColor: tokens.semantic.header.background.light, // Special handling
        borderBottom: `1px solid ${tokens.colors.border.primary}`,
      },

      // Sidebar styles
      sidebar: {
        backgroundColor: tokens.colors.background.secondary,
        borderRight: `1px solid ${tokens.colors.border.primary}`,
      },

      // Drag handle styles
      dragHandle: {
        backgroundColor: tokens.semantic.dragHandle.background.light, // Requires theme awareness
        cursor: "col-resize",
        transition: tokens.transitions.fast,
        "&:hover": {
          backgroundColor: tokens.colors.border.hover,
        },
      },

      // Hover effect
      hover: {
        transition: tokens.transitions.fast,
        "&:hover": {
          backgroundColor: tokens.colors.interactive.hover,
        },
      },

      // Text styles
      text: {
        primary: { color: tokens.colors.text.primary },
        secondary: { color: tokens.colors.text.secondary },
        disabled: { color: tokens.colors.text.disabled },
      },
    }),
    [tokens],
  );
};

/**
 * Theme-Aware Style Generator - Automatically handles dark/light theme differences
 */
export const useThemedStyles = () => {
  const { isDark } = useTheme();
  const tokens = useDesignTokens();

  return useMemo(
    () => ({
      // Project item background color
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
        return "transparent"; // Default background is transparent
      },

      // Error state styles
      errorState: {
        backgroundColor: isDark
          ? tokens.semantic.error.background.dark
          : tokens.semantic.error.background.light,
        borderColor: isDark
          ? tokens.semantic.error.border.dark
          : tokens.semantic.error.border.light,
      },

      // Header background (special handling)
      headerBg: isDark
        ? tokens.semantic.header.background.dark
        : tokens.semantic.header.background.light,

      // Drag handle background
      dragHandleBg: isDark
        ? tokens.semantic.dragHandle.background.dark
        : tokens.semantic.dragHandle.background.light,
    }),
    [isDark, tokens],
  );
};
