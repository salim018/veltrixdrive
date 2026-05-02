import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f7ff",
          100: "#e0efff",
          200: "#bae0ff",
          300: "#7cc5ff",
          400: "#36a8ff",
          500: "#0b8af0",
          600: "#006dcc",
          700: "#0157a4",
          800: "#064a87",
          900: "#0b3e70",
          950: "#082749"
        },
        ink: {
          900: "#0a1929",
          700: "#1f2a37",
          500: "#4b5563",
          300: "#9ca3af",
          100: "#f3f4f6"
        }
      },
      fontFamily: {
        display: ["'Manrope'", "system-ui", "sans-serif"],
        sans: ["'Inter'", "system-ui", "sans-serif"]
      },
      boxShadow: {
        soft: "0 4px 20px -8px rgba(11, 62, 112, 0.15)",
        glow: "0 0 0 6px rgba(11, 138, 240, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
