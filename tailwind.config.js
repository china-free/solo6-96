/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        slime: {
          400: "#b8ff3d",
          500: "#9de02a",
        },
        dish: {
          400: "#4cc9f0",
        },
        attractant: {
          400: "#9d4edd",
        },
        food: {
          400: "#ff6b35",
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
        sans: ['"Space Grotesk"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
