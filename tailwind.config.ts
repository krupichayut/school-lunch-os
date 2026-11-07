import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        botanical: {
          50: "#F2F8F5",
          100: "#E5F2EC",
          200: "#C7E2D6",
          300: "#9ECBB9",
          400: "#5EA88E",
          500: "#31866B",
          600: "#236B54",
          700: "#1F5E4B",
          800: "#194B3C",
          900: "#143B30",
          950: "#0A221B",
        },
        terracotta: {
          50: "#FDF6F3",
          100: "#FBEDE6",
          200: "#F6DACD",
          300: "#EDBBA5",
          400: "#E29474",
          500: "#D97757",
          600: "#BF5837",
          700: "#9B4327",
          800: "#7F3722",
          900: "#683020",
        },
        paper: {
          50: "#FFFFFF",
          100: "#FAF9F6",
          200: "#F4F2EB",
          300: "#EBE7DE",
          400: "#E0DACF",
          border: "#E7E4DC",
          divider: "#ECE8DE",
          text: "#18201C",
          muted: "#66746C",
        },
        brand: {
          50: "#f0f7ff",
          100: "#e0effe",
          200: "#bae0fd",
          300: "#7cc7fb",
          400: "#36aaf5",
          500: "#0c8ee9",
          600: "#0270c7",
          700: "#0359a1",
          800: "#074b84",
          900: "#0c3f6e",
          950: "#082849",
        },
      },
      fontFamily: {
        sans: [
          "'Prompt'",
          "'Anuphan'",
          "-apple-system",
          "BlinkMacSystemFont",
          "'Segoe UI'",
          "Roboto",
          "'Noto Sans Thai'",
          "sans-serif",
        ],
      },
      boxShadow: {
        "card": "0 1px 3px rgba(24, 32, 28, 0.04), 0 8px 24px -4px rgba(24, 32, 28, 0.06)",
        "soft": "0 2px 8px -2px rgba(24, 32, 28, 0.05), 0 1px 3px rgba(24, 32, 28, 0.03)",
        "floating": "0 12px 32px -8px rgba(24, 32, 28, 0.12), 0 4px 12px -2px rgba(24, 32, 28, 0.06)",
        "xs": "0 1px 2px rgba(24, 32, 28, 0.04)",
        "2xs": "0 1px 1px rgba(24, 32, 28, 0.03)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
