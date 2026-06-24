import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          red: "#C0182A",
          "red-dark": "#9B1322",
          black: "#000000",
          white: "#FFFFFF",
        },
        grey: {
          light: "#f5f5f5",
          border: "#e5e5e5",
          mid: "#666666",
          dark: "#333333",
        },
      },
      fontFamily: {
        sans: ["var(--font-ibm-plex)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "Menlo", "monospace"],
      },
      boxShadow: {
        panel: "0 1px 4px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.05)",
        "panel-lg": "0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
