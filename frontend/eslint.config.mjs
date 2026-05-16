import { defineConfig } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  {
    extends: [...nextCoreWebVitals],
    rules: {
      // Enforce practical production quality gates while we incrementally refactor effect-heavy pages.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "@next/next/no-img-element": "warn",
    },
  },
]);
