import type { Config } from "tailwindcss";

// Akro brand palette
//   #1A4A44 deep teal   → brand (primary)
//   #D4A017 gold        → gold (accent)
//   #453643 plum-grey   → plum (muted text / secondary)
//   #28112B aubergine   → ink (headings / darkest)
//   #E5F4E3 pale mint   → mint (page background)
const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      screens: {
        xs: "400px",
      },
      colors: {
        brand: {
          50: "#eef4f3",
          100: "#d6e5e2",
          200: "#aecbc6",
          300: "#7faaa3",
          400: "#4f857d",
          500: "#2d655d",
          600: "#1a4a44",
          700: "#143a35",
          800: "#102e2a",
          900: "#0c211e",
          950: "#061211",
        },
        gold: {
          50: "#fbf6e8",
          100: "#f6e9c2",
          200: "#edd286",
          300: "#e3ba4a",
          400: "#d9a82a",
          500: "#d4a017",
          600: "#ad8112",
          700: "#82610f",
          800: "#574109",
          900: "#2e2204",
        },
        plum: {
          DEFAULT: "#453643",
          400: "#6f5c6c",
          500: "#574554",
          600: "#453643",
          700: "#382b37",
        },
        ink: {
          DEFAULT: "#28112b",
          800: "#3a1d3e",
          900: "#28112b",
        },
        mint: {
          DEFAULT: "#e5f4e3",
          50: "#f2faf1",
          100: "#e5f4e3",
          200: "#d2ebcf",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["'Space Grotesk'", "Inter", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
