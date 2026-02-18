import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/cms/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        candy: {
          violet: "#7C3AED",
          pink: "#EC4899",
          amber: "#F59E0B",
          mint: "#10B981",
          cyan: "#06B6D4",
        },
        accent: {
          500: "hsl(220 90% 60%)",
          600: "hsl(220 90% 52%)"
        }
      },
      backgroundImage: {
        "candy-hero": "linear-gradient(135deg, #7C3AED 0%, #EC4899 40%, #F59E0B 100%)",
        "candy-mint": "linear-gradient(135deg, #10B981 0%, #06B6D4 100%)",
        "candy-fire": "linear-gradient(135deg, #F59E0B 0%, #EF4444 50%, #EC4899 100%)",
      },
      animation: {
        "orb-float": "orbFloat 12s ease-in-out infinite",
        "ticker": "tickerScroll 25s linear infinite",
        "shimmer": "shimmer 1.8s ease-in-out infinite",
      },
      keyframes: {
        orbFloat: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(-30px, -50px) scale(1.05)" },
          "66%": { transform: "translate(30px, 30px) scale(0.95)" },
        },
        tickerScroll: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        shimmer: {
          from: { backgroundPosition: "200% 0" },
          to: { backgroundPosition: "-200% 0" },
        },
      },
    }
  },
  plugins: [require("@tailwindcss/typography")]
};

export default config;
