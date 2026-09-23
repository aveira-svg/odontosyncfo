import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      borderWidth: {
        '1.5': '1.5px',
        '2': '2px',
        '3': '3px',
      },
      colors: {
        contrast: {
          bg: '#FFFFFF',
          page: '#F8FAFC',
          text: '#000000',
          muted: '#1E293B',
          border: '#475569',
          borderStrong: '#0F172A',
          primary: '#1D4ED8',
          danger: '#B91C1C',
          success: '#15803D',
          warning: '#B45309',
        }
      },
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

