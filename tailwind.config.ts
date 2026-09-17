import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./context/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#F0FDF4",
        ink: {
          DEFAULT: "#0F172A",
          soft: "#475569",
          faint: "#94A3B8",
        },
        brand: {
          DEFAULT: "#10B981",
          dark: "#059669",
          deep: "#065F46",
          tint: "#D1FAE5",
        },
        option: {
          red: "#EF4444",
          "red-border": "#DC2626",
          blue: "#3B82F6",
          "blue-border": "#2563EB",
          yellow: "#F59E0B",
          "yellow-border": "#D97706",
          green: "#10B981",
          "green-border": "#059669",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "20px",
      },
      keyframes: {
        "bounce-in": {
          "0%": { transform: "scale(0.4) translateY(10px)", opacity: "0" },
          "70%": { transform: "scale(1.06)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "pulse-soft": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.1)" },
        },
      },
      animation: {
        "bounce-in": "bounce-in 0.5s ease",
        "pulse-soft": "pulse-soft 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
