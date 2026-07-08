import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ["var(--font-sora)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        border: "var(--border)",
        aegis: {
          bg0: "#050810",
          bg1: "#0B1220",
          panel: "rgba(15, 23, 42, 0.6)",
          text: "#E7E9EE",
          textSecondary: "#9AA4B2",
          textMuted: "#6B7688",
          emerald: "#10B981",
          teal: "#06B6D4",
          violet: "#8B5CF6",
          indigo: "#6366F1",
        },
      },
      borderRadius: {
        xl2: "1rem",
      },
      keyframes: {
        "aurora-drift": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
      },
      animation: {
        "aurora-drift": "aurora-drift 48s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
