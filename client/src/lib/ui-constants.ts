/**
 * UI Constants for consistent styles across components
 * 
 * This file contains shared styling constants following Material Design principles
 */

// Card styling constants
export const CARD_STYLES = {
  // Material Design standard elevation shadows
  boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05), 0 1px 3px 1px rgba(0, 0, 0, 0.03)",
  elevatedShadow: "0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 4px 6px -1px rgba(0, 0, 0, 0.1)",
  borderRadius: "0.5rem", // 8dp rounded corners
  borderColor: "rgba(226, 232, 240, 0.8)",
  padding: {
    header: "1rem",
    content: "1.25rem"
  }
};

// Typography constants
export const TYPOGRAPHY = {
  // Font weights
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700
  },
  // Font sizes
  fontSize: {
    xs: "0.75rem",
    sm: "0.875rem", 
    base: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem"
  },
  // Line heights
  lineHeight: {
    tight: "1.25",
    normal: "1.5",
    relaxed: "1.75"
  },
  // Colors by semantic meaning
  color: {
    heading: "rgb(17, 24, 39)", // High contrast for headers
    body: "rgb(55, 65, 81)", // Primary text color
    muted: "rgb(107, 114, 128)", // Secondary/muted text
    faded: "rgb(156, 163, 175)" // Tertiary/disabled text
  }
};

// Spacing system (in px converted to rem)
export const SPACING = {
  '0': '0',
  '1': '0.25rem',
  '2': '0.5rem',
  '3': '0.75rem',
  '4': '1rem',
  '5': '1.25rem',
  '6': '1.5rem',
  '8': '2rem',
  '10': '2.5rem',
  '12': '3rem',
  '16': '4rem',
  '20': '5rem',
  '24': '6rem',
  '32': '8rem',
};

// Interactive element states
export const INTERACTIVE = {
  hover: {
    opacity: 0.9,
    transform: 'translateY(-1px)',
    transition: 'all 0.2s ease-in-out',
  },
  active: {
    opacity: 1,
    transform: 'translateY(0)',
  },
  focus: {
    outline: '2px solid rgba(59, 130, 246, 0.5)',
    outlineOffset: '2px',
  }
};

// Data visualization colors
export const VISUALIZATION_COLORS = {
  // Semantic colors
  success: '#10b981', // green-500
  warning: '#f59e0b', // amber-500
  error: '#ef4444',   // red-500
  info: '#3b82f6',    // blue-500
  
  // Chart color palette (accessible)
  chart: [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#8b5cf6', // purple
    '#f43f5e', // rose
    '#06b6d4', // cyan
    '#84cc16', // lime
    '#ec4899', // pink
  ],
};

// Color contrast values for accessibility
export const ACCESSIBLE_CONTRAST = {
  normalText: 4.5, // WCAG AA for normal text
  largeText: 3,    // WCAG AA for large text
  uiComponents: 3   // WCAG AA for UI components
};