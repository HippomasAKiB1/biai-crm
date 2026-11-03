import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#EDF0EB",
        surface: "#FBFCFA",
        ink: "#1E2924",
        muted: "#5E6B65",
        line: "#D3DAD4",
        brand: {
          DEFAULT: "#0B6B4F",
          soft: "#DCEBE4",
        },
        urgent: {
          DEFAULT: "#B3261E",
          soft: "#F6DEDB",
        },
        warn: {
          DEFAULT: "#9A6700",
          soft: "#F5E8C8",
        },
        stage: {
          new: "#9AA7A0",
          contacted: "#6F9C8B",
          interested: "#3F8068",
          paid: "#0B6B4F",
          lost: "#8A8F8C",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-hind-siliguri)",
          "var(--font-bengali)",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        bangla: [
          "var(--font-hind-siliguri)",
          "var(--font-bengali)",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
