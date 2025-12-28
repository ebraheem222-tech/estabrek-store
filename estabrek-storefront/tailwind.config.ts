import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/cms/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          500: "hsl(220 90% 60%)",
          600: "hsl(220 90% 52%)"
        }
      }
    }
  },
  plugins: [require("@tailwindcss/typography")]
};

export default config;
