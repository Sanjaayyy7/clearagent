/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ca: {
          bg: "#f0ede6",
          surface: "#f8f6f0",
          border: "#e0dbd2",
          text: "#0a0a0a",
          muted: "#8a8580",
          dim: "#c0bbb4",
          dark: "#0a0a0a",
          verified: "#16a34a",
          flagged: "#b45309",
        },
      },
      fontFamily: {
        display: ["Inter", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
