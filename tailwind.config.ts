import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontSize: {
        '3xs': '0.5rem',     // 8px
        '4xs': '0.375rem',   // 6px
        '5xs': '0.3125rem',  // 5px
      }
    }
  },
  plugins: []
};

export default config;

