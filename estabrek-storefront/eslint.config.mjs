// ESLint 9 (flat config) with Next's rules: `next lint` is gone in Next 16, so `npm run lint` runs ESLint itself.
import nextVitals from "eslint-config-next/core-web-vitals";

export default [
  ...nextVitals,
  {
    ignores: [".next/**", "node_modules/**", "public/**", "library-src/**", "test-results/**", "playwright-report/**"],
  },
];
