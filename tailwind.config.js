/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        emerald: {
          50: "#ecfdf5",
          100: "#d1fae5",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
        },
      },
    },
  },
  plugins: [],
};
