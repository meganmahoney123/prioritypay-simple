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
      // Without this, Tailwind's `font-mono` utility (used everywhere a
      // dollar figure is shown -- Dashboard, Accounts, Splits, etc.) falls
      // back to the browser's default system monospace font instead of the
      // IBM Plex Mono the Bloom design system actually specifies (see
      // lib/bloomTheme.js's --font-mono and the Figtree/IBM Plex Mono
      // Google Fonts link in app/layout.js) -- every currency number in
      // the app has been rendering in the wrong typeface.
      fontFamily: {
        mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
