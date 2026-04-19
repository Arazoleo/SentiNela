import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Fundos
        void:    "#020b07",
        deep:    "#041209",
        surface: "#061a0e",
        panel:   "#08231400",
        border:  "#0d3320",
        // Verde biomédico
        bio: {
          50:   "#e8f5e9",
          100:  "#c8e6c9",
          200:  "#a5d6a7",
          300:  "#4caf50",
          400:  "#00d67a",
          500:  "#00c56e",
          600:  "#00a85c",
          700:  "#007d42",
          neon: "#00ff87",
          dim:  "rgba(0, 214, 122, 0.12)",
          glow: "rgba(0, 214, 122, 0.35)",
        },
        // Ciano médico
        med: {
          400: "#22d3ee",
          500: "#06b6d4",
          dim: "rgba(6, 182, 212, 0.1)",
        },
        // Alertas
        alert: {
          low:       "#facc15",
          medium:    "#fb923c",
          high:      "#f87171",
          emergency: "#ef4444",
        },
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        body:    ["Inter", "sans-serif"],
        mono:    ["JetBrains Mono", "monospace"],
      },
      animation: {
        "ecg":          "ecg 3s ease-in-out infinite",
        "pulse-bio":    "pulse-bio 2.5s ease-in-out infinite",
        "scan":         "scan 4s linear infinite",
        "fade-in":      "fade-in 0.4s ease-out",
        "slide-up":     "slide-up 0.5s ease-out",
        "float":        "float 6s ease-in-out infinite",
        "ping-slow":    "ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite",
        "shimmer":      "shimmer 2.5s linear infinite",
        "blink":        "blink 1.2s step-end infinite",
        "draw-line":    "draw-line 1.5s ease-out forwards",
        "counter-up":   "fade-in 0.6s ease-out forwards",
      },
      keyframes: {
        ecg: {
          "0%":   { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(400%)" },
        },
        "pulse-bio": {
          "0%, 100%": { boxShadow: "0 0 12px rgba(0,214,122,0.15), 0 0 0 0 rgba(0,214,122,0)" },
          "50%":      { boxShadow: "0 0 30px rgba(0,214,122,0.4), 0 0 60px rgba(0,214,122,0.1)" },
        },
        scan: {
          "0%":   { top: "0", opacity: "0.8" },
          "95%":  { opacity: "0.8" },
          "100%": { top: "100%", opacity: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(32px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":      { transform: "translateY(-12px)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0" },
        },
        "draw-line": {
          from: { strokeDashoffset: "1000" },
          to:   { strokeDashoffset: "0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
