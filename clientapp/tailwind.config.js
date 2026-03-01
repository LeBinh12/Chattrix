/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#e5f0ff",
          100: "#b8d5ff",
          200: "#8ab9ff",
          300: "#5c9dff",
          400: "#2e82ff",
          500: "#0068ff", // Primary Zalo Blue
          600: "#0054cc",
          700: "#003f99",
          800: "#002a66",
          900: "#001533",
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
