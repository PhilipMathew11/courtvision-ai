import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "cv-bg":            "var(--cv-bg)",
        "cv-surface":       "var(--cv-surface)",
        "cv-card":          "var(--cv-card)",
        "cv-card-hover":    "var(--cv-card-hover)",
        "cv-border":        "var(--cv-border)",
        "cv-border-bright": "var(--cv-border-bright)",
        "cv-accent":        "var(--cv-accent)",
        "cv-accent-hover":  "var(--cv-accent-hover)",
        "cv-orange":        "var(--cv-orange)",
        "cv-blue":          "var(--cv-blue)",
        "cv-purple":        "var(--cv-purple)",
        "cv-green":         "var(--cv-green)",
        "cv-red":           "var(--cv-red)",
        "cv-gold":          "var(--cv-gold)",
        "cv-text":          "var(--cv-text)",
        "cv-muted":         "var(--cv-muted)",
        "cv-subtle":        "var(--cv-subtle)",
      },
      fontFamily: {
        display: ["Space Grotesk", "system-ui", "sans-serif"],
        sans:    ["Inter", "system-ui", "sans-serif"],
        mono:    ["JetBrains Mono", "monospace"],
        stat:    ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        accent: "0 0 24px rgba(249,115,22,0.25)",
        orange: "0 0 20px rgba(249,115,22,0.30)",
        card:   "0 4px 24px rgba(0,0,0,0.4)",
      },
      keyframes: {
        "slide-up": {
          "0%":   { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        livePulse: {
          "0%, 100%": { opacity: "1" },
          "50%":       { opacity: "0.4" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
      },
      animation: {
        "slide-up":   "slide-up 0.4s ease-out",
        "live-pulse": "livePulse 1.5s ease-in-out infinite",
        shimmer:      "shimmer 1.8s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
