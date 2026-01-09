import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Kympler-inspired color palette
      colors: {
        // Backgrounds
        bg: {
          0: "#FFFFFF",
          1: "#F5F5F5",
          2: "rgba(245, 245, 245, 0.35)",
          subtle: "rgba(245, 245, 245, 0.20)",
        },
        // Text colors
        text: {
          strong: "#000000",
          DEFAULT: "#000000",
          muted: "rgba(0, 0, 0, 0.60)",
          subtle: "rgba(0, 0, 0, 0.40)",
        },
        // Border colors
        border: {
          DEFAULT: "rgba(0, 0, 0, 0.10)",
          soft: "rgba(0, 0, 0, 0.08)",
          strong: "rgba(0, 0, 0, 0.15)",
        },
        // Status colors (restrained)
        status: {
          success: "#22C55E",
          warning: "#F59E0B",
          danger: "#EF4444",
          info: "#3B82F6",
        },
        // Accent (professional blue for primary actions)
        accent: {
          DEFAULT: "#2563EB",
          hover: "#1D4ED8",
          muted: "rgba(37, 99, 235, 0.08)",
        },
      },
      // Font families
      fontFamily: {
        heading: ["var(--font-plus-jakarta)", "system-ui", "sans-serif"],
        body: ["var(--font-inter)", "system-ui", "sans-serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      // Font sizes with line-height and letter-spacing
      fontSize: {
        // Headings
        "h1": ["3.25rem", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "700" }],
        "h1-mobile": ["2.5rem", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "700" }],
        "h2": ["2.25rem", { lineHeight: "1.15", letterSpacing: "-0.01em", fontWeight: "700" }],
        "h2-mobile": ["1.875rem", { lineHeight: "1.15", letterSpacing: "-0.01em", fontWeight: "700" }],
        "h3": ["1.625rem", { lineHeight: "1.2", letterSpacing: "-0.01em", fontWeight: "600" }],
        "h3-mobile": ["1.375rem", { lineHeight: "1.2", fontWeight: "600" }],
        "h4": ["1.25rem", { lineHeight: "1.3", fontWeight: "600" }],
        "h5": ["1.125rem", { lineHeight: "1.4", fontWeight: "600" }],
        // Body
        "body-lg": ["1rem", { lineHeight: "1.6", fontWeight: "400" }],
        "body": ["0.9375rem", { lineHeight: "1.55", fontWeight: "400" }],
        "body-sm": ["0.875rem", { lineHeight: "1.5", fontWeight: "400" }],
        // Small / Caption
        "caption": ["0.8125rem", { lineHeight: "1.4", fontWeight: "500" }],
        "small": ["0.75rem", { lineHeight: "1.4", fontWeight: "400" }],
      },
      // Border radius
      borderRadius: {
        card: "16px",
        button: "12px",
        input: "12px",
        pill: "999px",
      },
      // Box shadows (Kympler-style soft shadows)
      boxShadow: {
        soft: "0 8px 24px rgba(0, 0, 0, 0.08)",
        card: "0 6px 18px rgba(0, 0, 0, 0.06)",
        hover: "0 10px 30px rgba(0, 0, 0, 0.10)",
        "card-hover": "0 12px 32px rgba(0, 0, 0, 0.12)",
        input: "0 2px 8px rgba(0, 0, 0, 0.04)",
        "input-focus": "0 0 0 3px rgba(0, 0, 0, 0.08)",
      },
      // Spacing scale additions
      spacing: {
        "4.5": "1.125rem",
        "13": "3.25rem",
        "15": "3.75rem",
        "18": "4.5rem",
        "22": "5.5rem",
        "26": "6.5rem",
        "30": "7.5rem",
      },
      // Max widths
      maxWidth: {
        container: "1200px",
        "container-sm": "1100px",
        content: "800px",
      },
      // Animations
      transitionDuration: {
        DEFAULT: "180ms",
        fast: "120ms",
        normal: "180ms",
        slow: "280ms",
      },
      transitionTimingFunction: {
        DEFAULT: "cubic-bezier(0.25, 0.1, 0.25, 1)",
        "ease-out-soft": "cubic-bezier(0.25, 0.1, 0.25, 1)",
      },
      // Keyframes for subtle animations
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(8px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 180ms ease-out",
        "fade-in-up": "fade-in-up 220ms ease-out",
        "slide-in-right": "slide-in-right 180ms ease-out",
        "scale-in": "scale-in 180ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
