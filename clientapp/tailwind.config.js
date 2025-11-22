/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#F0F7FF",
          100: "#E0EFFD",
          200: "#B9DAFF",
          300: "#8EC2FF",
          400: "#5BA5FF",
          500: "#2E88FF",
          600: "#0068FF", // primary
          700: "#0056D6",
          800: "#0041A3",
          900: "#002E73",
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
    },
  },
  plugins: [require("@tailwindcss/typography"), require("tailwind-scrollbar")],
};
