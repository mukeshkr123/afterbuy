import js from "@eslint/js";
import prettier from "eslint-config-prettier";

export default [
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      ".sst/**",
      ".wrangler/**",
      "coverage/**",
    ],
  },
  js.configs.recommended,
  prettier,
];
