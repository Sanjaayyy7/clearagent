/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ca: {
          bg: "#060608",
          surface: "#0d0d14",
          "surface-2": "#13131e",
          border: "#1a1a2e",
          accent: "#ff6b35",
          teal: "#00d4aa",
          indigo: "#6366f1",
          text: "#e8e8f0",
          muted: "#6b6b80",
          danger: "#ef4444",
        },
      },
      fontFamily: {
        serif: ['"DM Serif Display"', "Georgia", "serif"],
        mono: ['"JetBrains Mono"', "Menlo", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
