/**
 * ProjectDuck Design System - Design Tokens
 *
 * This file defines the design standards for the entire application, including colors, spacing, borders, etc.
 * All components should use these tokens instead of hard-coded values
 */

export interface DesignTokens {
  colors: {
    // Primary background colors
    background: {
      primary: string;
      secondary: string;
      tertiary: string;
      overlay: string;
    };
    // Border colors
    border: {
      primary: string;
      secondary: string;
      hover: string;
    };
    // Text colors
    text: {
      primary: string;
      secondary: string;
      disabled: string;
    };
    // Status colors
    status: {
      success: string;
      warning: string;
      error: string;
      info: string;
    };
    // Interactive colors
    interactive: {
      hover: string;
      active: string;
      selected: string;
      focus: string;
    };
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    xxl: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
  };
  transitions: {
    fast: string;
    normal: string;
    slow: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
  };
  zIndex: {
    dropdown: number;
    modal: number;
    tooltip: number;
    overlay: number;
  };
}

// Light Theme Design Tokens
export const lightTokens: DesignTokens = {
  colors: {
    background: {
      primary: "#ffffff",
      secondary: "#fafafa",
      tertiary: "#f5f5f5",
      overlay: "rgba(0, 0, 0, 0.45)",
    },
    border: {
      primary: "#f0f0f0",
      secondary: "#d9d9d9",
      hover: "#bfbfbf",
    },
    text: {
      primary: "#000000d9", // rgba(0, 0, 0, 0.85)
      secondary: "#00000073", // rgba(0, 0, 0, 0.45)
      disabled: "#00000040", // rgba(0, 0, 0, 0.25)
    },
    status: {
      success: "#52c41a",
      warning: "#faad14",
      error: "#ff4d4f",
      info: "#1890ff",
    },
    interactive: {
      hover: "#e6f7ff",
      active: "#177ddc",
      selected: "#e6f7ff",
      focus: "#1890ff",
    },
  },
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px",
    xxl: "48px",
  },
  borderRadius: {
    sm: "2px",
    md: "6px",
    lg: "8px",
  },
  transitions: {
    fast: "0.1s cubic-bezier(0.4, 0, 0.2, 1)",
    normal: "0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    slow: "0.5s cubic-bezier(0.4, 0, 0.2, 1)",
  },
  shadows: {
    sm: "0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)",
    md: "0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)",
    lg: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  },
  zIndex: {
    dropdown: 1050,
    modal: 1000,
    tooltip: 1060,
    overlay: 1040,
  },
};

// Dark Theme Design Tokens
export const darkTokens: DesignTokens = {
  colors: {
    background: {
      primary: "#1f1f1f",
      secondary: "#141414",
      tertiary: "#1a1a1a",
      overlay: "rgba(0, 0, 0, 0.65)",
    },
    border: {
      primary: "#303030",
      secondary: "#262626",
      hover: "#404040",
    },
    text: {
      primary: "#ffffffd9", // rgba(255, 255, 255, 0.85)
      secondary: "#ffffff73", // rgba(255, 255, 255, 0.45)
      disabled: "#ffffff40", // rgba(255, 255, 255, 0.25)
    },
    status: {
      success: "#52c41a",
      warning: "#faad14",
      error: "#ff4d4f",
      info: "#1890ff",
    },
    interactive: {
      hover: "#262626",
      active: "#177ddc",
      selected: "#262626",
      focus: "#1890ff",
    },
  },
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px",
    xxl: "48px",
  },
  borderRadius: {
    sm: "2px",
    md: "6px",
    lg: "8px",
  },
  transitions: {
    fast: "0.1s cubic-bezier(0.4, 0, 0.2, 1)",
    normal: "0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    slow: "0.5s cubic-bezier(0.4, 0, 0.2, 1)",
  },
  shadows: {
    sm: "0 1px 2px 0 rgba(0, 0, 0, 0.16), 0 1px 6px -1px rgba(0, 0, 0, 0.12), 0 2px 4px 0 rgba(0, 0, 0, 0.09)",
    md: "0 1px 2px 0 rgba(0, 0, 0, 0.16), 0 1px 6px -1px rgba(0, 0, 0, 0.12), 0 2px 4px 0 rgba(0, 0, 0, 0.09)",
    lg: "0 4px 6px -1px rgba(0, 0, 0, 0.25), 0 2px 4px -1px rgba(0, 0, 0, 0.15)",
  },
  zIndex: {
    dropdown: 1050,
    modal: 1000,
    tooltip: 1060,
    overlay: 1040,
  },
};

// Special semantic colors (maintain consistency)
export const semanticColors = {
  // Ant Design primary color scheme
  antd: {
    primary: "#1890ff",
    primaryHover: "#40a9ff",
    primaryActive: "#096dd9",
  },
  // Project management colors
  project: {
    activeBg: {
      light: "#e6f7ff",
      dark: "#177ddc",
    },
    hoverBg: {
      light: "#f5f5f5",
      dark: "#1a1a1a",
    },
    normalBg: {
      light: "#f5f5f5",
      dark: "#262626",
    },
  },
  // Error state colors
  error: {
    background: {
      light: "#fff2f0",
      dark: "#2a1215",
    },
    border: {
      light: "#ffccc7",
      dark: "#a61d24",
    },
  },
  // Header special colors
  header: {
    background: {
      light: "#fff",
      dark: "#001529",
    },
  },
  // Drag handle colors
  dragHandle: {
    background: {
      light: "#ddd",
      dark: "#555",
    },
  },
} as const;
