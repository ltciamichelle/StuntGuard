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
        berry: {
          DEFAULT: "#A72449",
          dark: "#7A1733",
          light: "#F9E9ED",
          hover: "#BF2A54",
        },
        slateTeal: {
          DEFAULT: "#44636D",
          dark: "#2C4249",
          light: "#EDF3F5",
        },
        pageBg: "#FAFAFA",
        status: {
          green: "#22C55E",
          yellow: "#F2B705",
          red: "#E5383B",
        },
      },
      fontFamily: {
        sans: ["var(--font-plus-jakarta)", "sans-serif"],
      },
      borderRadius: {
        card: "24px",
      },
      boxShadow: {
        soft: "0 8px 24px -4px rgba(68, 99, 109, 0.08), 0 2px 6px -1px rgba(68, 99, 109, 0.03)",
        alert: "0 12px 30px -4px rgba(229, 56, 59, 0.25)",
      },
      minHeight: {
        kaderBtn: "56px",
      },
    },
  },
  plugins: [],
};

export default config;
