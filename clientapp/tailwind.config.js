/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#e0f2fe",
          100: "#bae6fd",
          200: "#7dd3fc",
          300: "#38bdf8",
          400: "#0ea5e9",
          500: "#00568c", 
          600: "#004a78", // Darker for hover
          700: "#003e64",
          800: "#003250",
          900: "#00263c",
        },
        surface: {
          DEFAULT: "#F5F7FB",
          card: "#FFFFFF",
          muted: "#EEF2F6",
        },
        line: {
          DEFAULT: "#E6EAF1",
        },
      },
      fontFamily: {
        roboto: ["Roboto", "sans-serif"],
      },
    },
  },
  plugins: [require("@tailwindcss/typography"), require("tailwind-scrollbar")],
};
