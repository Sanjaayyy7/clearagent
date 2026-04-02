/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "#08080c",
          surface: "#111118",
          border: "#1e1e2a",
          accent: "#ff6b35",
          teal: "#00d4aa",
          muted: "#6b7280",
          text: "#e5e7eb",
        },
      },
    },
  },
  plugins: [],
};
