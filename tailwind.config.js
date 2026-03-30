/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        body: ["var(--font-manrope)", "ui-sans-serif", "system-ui"],
      },
      colors: {
        ink: "rgb(var(--ink) / <alpha-value>)",
        "ink-soft": "rgb(var(--ink-soft) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        paper: "rgb(var(--paper) / <alpha-value>)",
        sand: "rgb(var(--sand) / <alpha-value>)",
        mint: "rgb(var(--mint) / <alpha-value>)",
        teal: "rgb(var(--teal) / <alpha-value>)",
        coral: "rgb(var(--coral) / <alpha-value>)",
        ocean: "rgb(var(--ocean) / <alpha-value>)",
        glass: "rgb(var(--glass) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
      },
      boxShadow: {
        soft: "0 24px 60px rgba(11, 27, 36, 0.16)",
      },
      borderRadius: {
        xl: "20px",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
