/**
 * Design Tokens for OKRs Tracker
 * 
 * Based on Kympler's design system: neutral palette, crisp typography,
 * soft shadows, rounded cards, generous whitespace, subtle borders.
 * 
 * These tokens complement the Tailwind config and provide type-safe
 * access to design values when needed in JavaScript/TypeScript.
 */

export const colors = {
  // Backgrounds
  bg: {
    primary: "#FFFFFF",      // bg-bg-0
    secondary: "#F5F5F5",    // bg-bg-1
    tertiary: "rgba(245, 245, 245, 0.35)", // bg-bg-2
    subtle: "rgba(245, 245, 245, 0.20)",
  },
  
  // Text
  text: {
    strong: "#000000",
    default: "#000000",
    muted: "rgba(0, 0, 0, 0.60)",
    subtle: "rgba(0, 0, 0, 0.40)",
  },
  
  // Borders
  border: {
    default: "rgba(0, 0, 0, 0.10)",
    soft: "rgba(0, 0, 0, 0.08)",
    strong: "rgba(0, 0, 0, 0.15)",
  },
  
  // Status (restrained usage)
  status: {
    success: "#22C55E",
    warning: "#F59E0B",
    danger: "#EF4444",
    info: "#3B82F6",
  },
  
  // Accent (professional blue for primary actions)
  accent: {
    default: "#2563EB",
    hover: "#1D4ED8",
    muted: "rgba(37, 99, 235, 0.08)",
  },
} as const;

export const typography = {
  fontFamily: {
    heading: "'Plus Jakarta Sans', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif",
  },
  
  fontSize: {
    h1: { desktop: "52px", mobile: "40px" },
    h2: { desktop: "36px", mobile: "30px" },
    h3: { desktop: "26px", mobile: "22px" },
    h4: "20px",
    h5: "18px",
    bodyLg: "16px",
    body: "15px",
    bodySm: "14px",
    caption: "13px",
    small: "12px",
  },
  
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  
  lineHeight: {
    tight: 1.1,
    snug: 1.2,
    normal: 1.5,
    relaxed: 1.6,
  },
  
  letterSpacing: {
    tighter: "-0.02em",
    tight: "-0.01em",
    normal: "0",
  },
} as const;

export const spacing = {
  section: {
    desktop: { y: "80px" },
    mobile: { y: "48px" },
  },
  container: {
    maxWidth: "1200px",
    padding: { desktop: "32px", mobile: "20px" },
  },
  gap: {
    xs: "8px",
    sm: "12px",
    md: "16px",
    lg: "24px",
    xl: "32px",
    "2xl": "48px",
  },
} as const;

export const borderRadius = {
  card: "16px",
  button: "12px",
  input: "12px",
  pill: "999px",
  sm: "8px",
  md: "12px",
  lg: "16px",
} as const;

export const shadows = {
  soft: "0 8px 24px rgba(0, 0, 0, 0.08)",
  card: "0 6px 18px rgba(0, 0, 0, 0.06)",
  hover: "0 10px 30px rgba(0, 0, 0, 0.10)",
  cardHover: "0 12px 32px rgba(0, 0, 0, 0.12)",
  input: "0 2px 8px rgba(0, 0, 0, 0.04)",
  inputFocus: "0 0 0 3px rgba(0, 0, 0, 0.08)",
} as const;

export const transitions = {
  duration: {
    fast: "120ms",
    normal: "180ms",
    slow: "280ms",
  },
  easing: {
    default: "cubic-bezier(0.25, 0.1, 0.25, 1)",
    easeOut: "cubic-bezier(0.25, 0.1, 0.25, 1)",
  },
} as const;

// Z-index scale
export const zIndex = {
  dropdown: 50,
  sticky: 100,
  fixed: 200,
  modal: 300,
  toast: 400,
  tooltip: 500,
} as const;

// Breakpoints (matching Tailwind defaults)
export const breakpoints = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
} as const;

export type StatusColor = keyof typeof colors.status;
export type SpacingGap = keyof typeof spacing.gap;
