/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ca: {
          bg: "#03030a",
          surface: "#080818",
          "surface-2": "#0e0e24",
          "surface-3": "#141430",
          border: "#1e1e40",
          accent: "#7c3aed",   // violet — brand
          cta: "#f97316",       // orange — action only
          verified: "#10b981",
          flagged: "#f59e0b",
          text: "#f0f0fa",
          muted: "#6b6b90",
          dim: "#4a4a6a",
        },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', "Georgia", "serif"],
        body: ['"DM Sans"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
