import js from "@eslint/js";

import tseslint from "typescript-eslint";
import prettier from "eslint-plugin-prettier";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: [
      "dist/**", // ignore build outputs
      "node_modules/**",
      "*.config.*", // ignore config files
      "cdk.out/**",
      "coverage/**"
    ],
  },
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    plugins: { js, prettier },
    rules: {
      "prettier/prettier": "error",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "off",
    },
    extends: ["js/recommended"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: ['./tsconfig.eslint.json'],
      },
    },
  },
  tseslint.configs.recommended,
]);
